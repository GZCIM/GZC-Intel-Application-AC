from datetime import datetime, timedelta
import socket
import ssl
import threading
import time
import logging
import traceback
import uuid
from simplefix import FixMessage, FixParser
from threading import Lock
import select
import pandas as pd
from dateutil.relativedelta import relativedelta

# from sqlalchemy import create_engine
# from app.dao.fix_execution_report_dao import FixExecutionReportDAO
from app.dao.redis_dao import RedisDAO

# Create an empty DataFrame


logger = logging.getLogger(__name__)


class FixConnection:
    def __init__(
        self,
        host,
        port,
        sender_comp_id,
        target_comp_id,
        tls_cert=None,
        tls_key=None,
        log_file="fix_logs.txt",
        msg_seq_num_file="msg_seq_num.txt",
        db_url=None,
        quote_type=None,
        redis_host="localhost",
        redis_port=6379,
        redis_db=0,
        redis_password=None,
        redis_ssl=False,
    ):
        self.host = host
        self.port = port
        self.sender_comp_id = sender_comp_id
        self.target_comp_id = target_comp_id
        if tls_cert and tls_key:
            self.tls_cert = tls_cert
            self.tls_key = tls_key
        else:
            # Path to client certificate
            self.tls_cert = "C:\\repo\\FXSpotStream\\192.168.50.103.pem"
            # Path to client key
            self.tls_key = "C:\\repo\\FXSpotStream\\192.168.50.103-key.pem"
        self.sock = None
        self.parser = FixParser()
        self.connected = False
        self.heartbeat_interval = 60  # Default heartbeat interval in seconds
        self.msg_seq_num_file = msg_seq_num_file
        self.reconnect_lock = Lock()
        self.msg_id = self.load_last_seq_num()
        self.createFixLog(log_file)
        self.on_price_update = None
        self.on_trade_pending = None
        self.on_trade_partial_fill = None
        self.on_trade_fill = None
        self.on_trade_cancel = None
        self.on_trade_reject = None
        self.on_trade_expired = None
        self.quotes_df = pd.DataFrame(
            columns=[
                "quote_req_id",
                "quote_id",
                "symbol",
                "type",
                "currency",
                "provider",
                "bid",
                "ask",
                "net_price",
                "forward_price",
                "spot_price",
                "fwd_points",
                "md_entry_type",
                "order_qty",
                "side",
                "depth",
                "timestamp",
                "settlement_type",
                "value_date",
            ]
        )
        self.quote_requests: dict[str, FixMessage] = {}
        self.market_data_requests: dict[
            str, dict
        ] = {}  # Store MD request details by MDReqID
        # self.old_messages = {}
        self.engine = None
        # if db_url is not None:
        #     self.engine = create_engine(db_url, pool_pre_ping=True)
        if quote_type is not None:
            self.redis_dao = RedisDAO(
                quote_type=quote_type,
                host=redis_host,
                port=redis_port,
                db=redis_db,
                password=redis_password,
                ssl=redis_ssl,
            )

    def load_last_seq_num(self):
        try:
            with open(self.msg_seq_num_file, "r") as file:
                return int(file.read().strip())
        except FileNotFoundError:
            with open(self.msg_seq_num_file, "w") as file:
                file.write("1")
            return 1

    def save_last_seq_num(self):
        with open(self.msg_seq_num_file, "w") as file:
            file.write(str(self.msg_id))

    def createFixLog(self, log_file):
        if log_file is None:
            self.log_file = None
            return
        self.log_file = log_file
        try:
            with open(self.log_file, "w"):
                pass
            logger.info(f"Log file '{self.log_file}' initialized and cleared.")
        except Exception as e:
            logger.error(f"Failed to initialize log file '{self.log_file}': {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())

    def connect(self):
        try:
            context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
            context.check_hostname = True
            context.verify_mode = ssl.CERT_REQUIRED

            # Ensure only TLS 1.2 or higher is used
            context.options |= ssl.OP_NO_TLSv1
            context.options |= ssl.OP_NO_TLSv1_1

            if self.tls_cert and self.tls_key:
                try:
                    context.load_cert_chain(
                        certfile=self.tls_cert, keyfile=self.tls_key
                    )
                except ssl.SSLError as e:
                    logger.error(f"SSL error loading certificates: {e}")
                    raise
                except FileNotFoundError as e:
                    logger.error(f"Certificate file not found: {e}")
                    raise

            raw_sock = socket.create_connection((self.host, self.port))
            self.sock = context.wrap_socket(raw_sock, server_hostname=self.host)
            self.connected = True
            logger.info(
                f"""Connected to FIX gateway at {self.host}:{self.port} using TLS"""
            )

            threading.Thread(target=self.listen, daemon=True).start()
        except ssl.SSLError as e:
            logger.error(f"SSL error during connection: {e}")
            self.connected = False
        except Exception as e:
            logger.error(f"Error connecting to FIX gateway: {e}")
            self.connected = False

    def disconnect(self):
        # Proceed to close the socket
        if self.sock:
            try:
                self.sock.shutdown(
                    socket.SHUT_RDWR
                )  # Disable further send and receive operations
                self.sock.close()
                logger.info("Socket successfully closed")
            except Exception as e:
                logger.error(f"Error closing socket: {e}")
        self.sock = None
        self.connected = False
        logger.info("Disconnected from FIX gateway")

    def logout(self):
        if self.connected:
            try:
                # Construct and send the Logout message
                logout_message = self.create_logout_message()
                self.send(logout_message.encode().decode())
                logger.info("Logout message sent")

                # Wait for a confirming Logout message from the counterparty
                if self.wait_for_logout_confirmation(
                    timeout=5
                ):  # Adjust timeout as needed
                    logger.info("Logout confirmation received")
                else:
                    logger.warning(
                        "No logout confirmation received; proceeding with disconnection"
                    )
                pass  # Send logout request and wait for confirmation
            except Exception as e:
                logger.error(f"Error during logout process: {e}")

    def wait_for_logout_confirmation(self, timeout=5):
        """
        Waits for a confirming Logout message from the counterparty within the specified timeout.
        Returns True if a Logout confirmation is received; False otherwise.
        """
        end_time = time.time() + timeout
        while time.time() < end_time:
            try:
                # Check if there's data to read on the socket
                ready_to_read, _, _ = select.select(
                    [self.sock], [], [], end_time - time.time()
                )
                if ready_to_read:
                    assert self.sock is not None
                    try:
                        data = self.sock.recv(4096)
                    except Exception as e:
                        logger.error(f"Error in recv: {e}")
                        logger.error("Stack Trace:")
                        logger.error(traceback.format_exc())
                        data = None
                    if data:
                        self.parser.append_buffer(data)
                        while True:
                            message = self.parser.get_message()
                            if message is None:
                                break
                            msg_type = message.get(35)
                            if msg_type == b"5":  # Logout message
                                logger.info(
                                    "Received Logout confirmation from counterparty."
                                )
                                return True
                            else:
                                # Handle other message types as needed
                                self.handle_message(message)
            except Exception as e:
                logger.error(f"Error while waiting for Logout confirmation: {e}")
                logger.error("Stack Trace:")
                logger.error(traceback.format_exc())
                break
        logger.warning("Timeout waiting for Logout confirmation.")
        return False

    def send(self, message):
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        self.msg_id += 1
        logger.debug(f"Sending FIX Message: {message}")
        self.log_fix_message("OUT", message)

        try:
            assert self.sock is not None

            # [MOD] Use select to check writability before sending to avoid 10054 errors
            _, writable, _ = select.select([], [self.sock], [], 0)
            if self.sock in writable:
                self.sock.sendall(message.encode())
            else:
                logger.warning("Socket not writable. Skipping send.")
                self.connected = False
                self.disconnect()
                return

        except (ConnectionResetError, ssl.SSLError, socket.error) as e:
            # [MOD] More specific error handling and logging
            logger.error(f"Socket send error: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            self.connected = False
            self.disconnect()  # [MOD] Ensure clean socket close
            raise

        except Exception as e:
            logger.error(f"Unexpected error while sending: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise

        self.save_last_seq_num()

    def listen(self):
        while self.connected:
            try:
                assert self.sock is not None
                try:
                    data = self.sock.recv(4096)
                except Exception as e:
                    logger.error(f"Error in recv: {e}")
                    logger.error("Stack Trace:")
                    logger.error(traceback.format_exc())
                    data = None
                if data:
                    self.parser.append_buffer(data)
                    while True:
                        message = self.parser.get_message()
                        if message is None:
                            break
                        logger.debug(f"Received FIX Message: {str(message)}")
                        self.log_fix_message("IN", message)
                        self.handle_message(message)
            except Exception as e:
                logger.error(f"Error receiving FIX messages: {e}")
                logger.error("Stack Trace:")
                logger.error(traceback.format_exc())
                # self.disconnect()

    def handle_message(self, message: FixMessage):
        msg_type = message.get(35)  # Message Type
        if msg_type == b"A":  # Logon
            logger.debug("Received Logon")
        elif msg_type == b"0":  # Heartbeat
            logger.debug("Received Heartbeat")
        elif msg_type == b"1":  # Test Request
            self.process_test_request(message)
        elif msg_type == b"2":  # Resend Request
            new_seq_num = int(message.get(7) or 1)

            if new_seq_num != 1:
                self.msg_id = new_seq_num
                self.send_gap_fill(new_seq_num, self.msg_id + 1)
                logger.info(f"Sequence reset to {self.msg_id + 1}")
            else:
                self.msg_id = 1
                logger.info("Sequence reset to 1")
            self.save_last_seq_num()

        elif msg_type == b"3":
            self.handle_reject_message(message)
        elif msg_type == b"5":  # Logout
            logger.info("Received Logout")
        elif msg_type == b"8":  # Execution Report
            self.process_execution_report(message)
        elif msg_type == b"b":  # Quote Response
            self.process_quote_response(message)
        elif msg_type == b"i":
            self.process_quote(message)
        elif msg_type == b"W":  # Market Data Snapshot/Update
            self.process_market_data_snapshot(message)
        elif msg_type == b"Y":
            # Market Data Request Accepted - lookup original request details
            request_id_field = message.get(262)
            request_id = (
                request_id_field.decode() if request_id_field is not None else None
            )

            # FSS server doesn't echo back Symbol/SettlType/NDF in Y message
            # Look up the original request details by MDReqID
            if request_id and request_id in self.market_data_requests:
                request_details = self.market_data_requests[request_id]
                if request_details.get("batch", False):
                    # Handle batch request
                    symbols = request_details["symbols"]
                    settl_types = request_details["settl_types"]
                    ndf = request_details["ndf"]
                    logger.info(
                        f"Market Data Request Accepted (Batch): RequestID={request_id}, "
                            f"Symbols={symbols}, SettlTypes={settl_types}, NDF={ndf}"
                        )
                else:
                    # Handle single request
                    symbol = request_details["symbol"]
                    settl_type = request_details["settl_type"]
                    ndf = request_details["ndf"]
                    logger.info(
                        f"Market Data Request Accepted: RequestID={request_id}, Symbol={symbol}, SettlType={settl_type}, NDF={ndf}"
                    )
            else:
                # Fallback: try to extract from message (though FSS doesn't send these)
                symbol_field = message.get(55)
                symbol = (
                    symbol_field.decode() if symbol_field is not None else "Unknown"
                )
                settl_type_field = message.get(63)
                settl_type = (
                    settl_type_field.decode()
                    if settl_type_field is not None
                    else "Unknown"
                )
                ndf_field = message.get(167)
                ndf = ndf_field.decode() if ndf_field is not None else False

                logger.info(
                    f"Market Data Request Accepted (Unknown): RequestID={request_id}, Symbol={symbol}, SettlType={settl_type}, NDF={ndf}"
                )

        else:
            logger.warning(f"Unhandled FIX message type: {msg_type}")

    def process_execution_report(self, message: FixMessage):
        """
        Process an Execution Report (MsgType=8) for both ESP and RFS sessions.

        Args:
            message (FixMessage): The FIX message to process.
        """

        try:
            # Extract common fields from Execution Report
            cl_ord_id_field = message.get(11)
            cl_ord_id = (
                cl_ord_id_field.decode() if cl_ord_id_field is not None else None
            )  # ClOrdID

            text_field = message.get(58)
            text = text_field.decode() if text_field is not None else None  # Text
            execution_id_field = message.get(17)
            execution_id = (
                execution_id_field.decode() if execution_id_field is not None else None
            )
            order_id_field = message.get(37)
            order_id = order_id_field.decode() if order_id_field is not None else None
            quote_req_id_field = message.get(131)
            quote_req_id = (
                quote_req_id_field.decode() if quote_req_id_field is not None else None
            )
            quote_id_field = message.get(117)
            quote_id = quote_id_field.decode() if quote_id_field is not None else None
            order_origination_id_field = message.get(693)
            order_origination_id = (
                order_origination_id_field.decode()
                if order_origination_id_field is not None
                else None
            )
            symbol_field = message.get(55)
            symbol = symbol_field.decode() if symbol_field is not None else None
            side_field = message.get(54)
            side = int(side_field.decode()) if side_field is not None else None
            order_qty_field = message.get(38)
            order_qty = (
                float(order_qty_field.decode()) if order_qty_field is not None else None
            )
            price_field = message.get(44)
            price = float(price_field.decode()) if price_field is not None else None
            last_shares_field = message.get(32)
            last_shares = (
                float(last_shares_field.decode())
                if last_shares_field is not None
                else None
            )
            last_px_field = message.get(31)
            last_px = (
                float(last_px_field.decode()) if last_px_field is not None else None
            )
            avg_px_field = message.get(6)
            avg_px = float(avg_px_field.decode()) if avg_px_field is not None else None
            leaves_qty_field = message.get(151)
            leaves_qty = (
                float(leaves_qty_field.decode())
                if leaves_qty_field is not None
                else None
            )
            cum_qty_field = message.get(14)
            cum_qty = (
                float(cum_qty_field.decode()) if cum_qty_field is not None else None
            )
            execution_type_field = message.get(150)
            execution_type = (
                execution_type_field.decode()
                if execution_type_field is not None
                else None
            )
            order_status_field = message.get(39)
            order_status = (
                order_status_field.decode() if order_status_field is not None else None
            )
            settl_type_field = message.get(63)
            settl_type = (
                settl_type_field.decode() if settl_type_field is not None else None
            )
            settl_date_field = message.get(64)
            settl_date = (
                datetime.strptime(settl_date_field.decode(), "%Y%m%d").date()
                if settl_date_field is not None
                else None
            )
            trade_date_field = message.get(75)
            trade_date = (
                datetime.strptime(trade_date_field.decode(), "%Y%m%d").date()
                if trade_date_field is not None
                else None
            )
            transact_time_field = message.get(60)
            transact_time = (
                datetime.strptime(transact_time_field.decode(), "%Y%m%d-%H:%M:%S.%f")
                if transact_time_field is not None
                else None
            )
            currency_field = message.get(15)
            currency = currency_field.decode() if currency_field is not None else None
            order_type_field = message.get(40)
            order_type = (
                order_type_field.decode() if order_type_field is not None else None
            )
            time_in_force_field = message.get(59)
            time_in_force = (
                time_in_force_field.decode()
                if time_in_force_field is not None
                else None
            )
            last_market_field = message.get(30)
            last_market = (
                last_market_field.decode() if last_market_field is not None else None
            )
            clearing_firm_field = message.get(439)
            clearing_firm = (
                clearing_firm_field.decode()
                if clearing_firm_field is not None
                else None
            )
            venue_field = message.get(100)
            venue = venue_field.decode() if venue_field is not None else None
            counterparty_id_field = message.get(448)
            counterparty_id = (
                counterparty_id_field.decode()
                if counterparty_id_field is not None
                else None
            )
            fix_raw_message = str(message)  # Store full FIX message as string

            logger.info(
                f"Processing Execution Report: ExecutionID={execution_id}, OrderID={order_id}, Symbol={symbol}"
            )

            # Store in DB using DAO

            # if self.engine is None:
            #     logger.error(
            #         "No database engine specified. Execution Report not saved."
            #     )
            #     raise ConnectionError("No database engine specified.")
            # else:
            #     con = self.engine.connect()
            #     dao = FixExecutionReportDAO(con)
            #     dao.insert_fix_execution(
            #         execution_id,
            #         cl_ord_id,
            #         order_id,
            #         quote_req_id,
            #         quote_id,
            #         order_origination_id,
            #         symbol,
            #         side,
            #         order_qty,
            #         price,
            #         last_shares,
            #         last_px,
            #         avg_px,
            #         leaves_qty,
            #         cum_qty,
            #         execution_type,
            #         order_status,
            #         settl_type,
            #         settl_date,
            #         trade_date,
            #         transact_time,
            #         currency,
            #         order_type,
            #         time_in_force,
            #         last_market,
            #         clearing_firm,
            #         venue,
            #         counterparty_id,
            #         text,
            #         fix_raw_message,
            #         "System",
            #     )
            # Determine session type (ESP or RFS) based on presence of QuoteID
            session_type = "RFS" if quote_id else "ESP"

            logger.info(
                f"Execution Report (Session={session_type}): OrderID={order_id}, ClOrdID={cl_ord_id}, "
                f"ExecType={execution_type}, OrdStatus={order_status}, Symbol={symbol}, Side={side}, "
                f"Price={price}, Quantity={order_qty}, LastPrice={last_px}, LastQuantity={last_shares}, "
                f"QuoteID={quote_id}, Text={text}"
            )

            # Handle specific ExecType scenarios
            match execution_type:
                case "0":  # New (Order acknowledged)
                    logger.info(f"{session_type} Order {cl_ord_id} acknowledged.")

                case "1":  # Partial fill
                    logger.info(
                        f"{session_type} Order {cl_ord_id} partially filled: LastPrice={last_px}, "
                        f"LastQuantity={last_shares}. Remaining Quantity={leaves_qty}."
                    )
                    if callable(self.on_trade_partial_fill):
                        self.on_trade_partial_fill(
                            {
                                "session_type": session_type,
                                "order_id": order_id,
                                "cl_ord_id": cl_ord_id,
                                "exec_type": execution_type,
                                "ord_status": order_status,
                                "symbol": symbol,
                                "side": side,
                                "price": price,
                                "quantity": order_qty,
                                "last_price": last_px,
                                "last_quantity": last_shares,
                                "text": text,
                                "quote_id": quote_id,
                            }
                        )

                case "2":  # Fully filled
                    logger.info(
                        f"{session_type} Order {cl_ord_id} fully filled: LastPrice={last_px}, "
                        f"LastQuantity={last_shares}."
                    )
                    if callable(self.on_trade_fill):
                        self.on_trade_fill(
                            {
                                "session_type": session_type,
                                "order_id": order_id,
                                "cl_ord_id": cl_ord_id,
                                "exec_type": execution_type,
                                "ord_status": order_status,
                                "symbol": symbol,
                                "side": side,
                                "price": price,
                                "quantity": order_qty,
                                "last_price": last_px,
                                "last_quantity": last_shares,
                                "text": text,
                                "quote_id": quote_id,
                            }
                        )

                case "4":  # Canceled
                    logger.warning(
                        f"{session_type} Order {cl_ord_id} was canceled. Reason: {text}"
                    )
                    if callable(self.on_trade_cancel):
                        self.on_trade_cancel(
                            {
                                "session_type": session_type,
                                "order_id": order_id,
                                "cl_ord_id": cl_ord_id,
                                "exec_type": execution_type,
                                "ord_status": order_status,
                                "symbol": symbol,
                                "side": side,
                                "price": price,
                                "quantity": order_qty,
                                "last_price": last_px,
                                "last_quantity": last_shares,
                                "text": text,
                                "quote_id": quote_id,
                            }
                        )

                case "8":  # Rejected
                    logger.error(
                        f"{session_type} Order {cl_ord_id} rejected: {text}. QuoteID={quote_id}."
                    )
                    if callable(self.on_trade_reject):
                        self.on_trade_reject(
                            {
                                "session_type": session_type,
                                "order_id": order_id,
                                "cl_ord_id": cl_ord_id,
                                "exec_type": execution_type,
                                "ord_status": order_status,
                                "symbol": symbol,
                                "side": side,
                                "price": price,
                                "quantity": order_qty,
                                "last_price": last_px,
                                "last_quantity": last_shares,
                                "text": text,
                                "quote_id": quote_id,
                            }
                        )
                case "A":  # Pending New
                    logger.info(
                        f"{session_type} Order {cl_ord_id} is pending acknowledgment. Monitoring for further updates..."
                    )

                    if callable(self.on_trade_pending):
                        self.on_trade_pending(
                            {
                                "session_type": session_type,
                                "order_id": order_id,
                                "cl_ord_id": cl_ord_id,
                                "exec_type": execution_type,
                                "ord_status": order_status,
                                "symbol": symbol,
                                "side": side,
                                "price": price,
                                "quantity": order_qty,
                                "last_price": last_px,
                                "last_quantity": last_shares,
                                "text": text,
                                "quote_id": quote_id,
                            }
                        )
                    logger.info(
                        f"{session_type} Order {cl_ord_id} added to pending orders for monitoring."
                    )

                case "C":  # Expired
                    logger.warning(f"{session_type} Order {cl_ord_id} expired.")
                    if callable(self.on_trade_expired):
                        self.on_trade_expired(
                            {
                                "session_type": session_type,
                                "order_id": order_id,
                                "cl_ord_id": cl_ord_id,
                                "exec_type": execution_type,
                                "ord_status": order_status,
                                "symbol": symbol,
                                "side": side,
                                "price": price,
                                "quantity": order_qty,
                                "last_price": last_px,
                                "last_quantity": last_shares,
                                "text": text,
                                "quote_id": quote_id,
                            }
                        )

                case _:  # Unhandled ExecType
                    logger.warning(
                        f"Unhandled ExecType {execution_type} for {session_type} Order {cl_ord_id}."
                    )

            # Additional processing or callbacks for Execution Reports can go here

        except Exception as e:
            logger.error(f"Error processing Execution Report: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())

    def process_test_request(self, message):
        test_request_id = message.get(112).decode()  # Example: "SmartFIX_0"
        # Build a Heartbeat message (35=0) in response
        self.send_heartbeat(test_request_id)

    def logon(
        self,
        username,
        password,
    ):
        if not self.connected:
            raise ConnectionError("Cannot log on: Not connected to FIX gateway")

        try:
            logon_message = FixMessage()
            logon_message.append_pair(8, "FIX.4.4")
            # Protocol version
            logon_message.append_pair(34, self.msg_id)
            logon_message.append_pair(35, "A")  # Logon message
            logon_message.append_pair(49, self.sender_comp_id)  # SenderCompID
            logon_message.append_pair(52, str(int(time.time())))  # SendingTime
            logon_message.append_pair(56, self.target_comp_id)  # TargetCompID
            logon_message.append_pair(98, "0")  # ResetSeqNumFlag
            logon_message.append_pair(
                108, str(self.heartbeat_interval)
            )  # Heartbeat interval
            # logon_message.append_pair(553, username)  # Username
            # logon_message.append_pair(554, password)  # Password

            self.send(logon_message.encode().decode())
            # sleep 1 second
            time.sleep(2)
            logger.info("Logon message sent successfully")
            self.username = username
            self.password = password
            self.start_heartbeat_thread()
        except Exception as e:
            logger.error(f"Logon failed: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise

    def create_logout_message(self):
        logout_message = FixMessage()
        logout_message.append_pair(8, "FIX.4.4")  # BeginString: FIX protocol version
        logout_message.append_pair(35, "5")  # MsgType: Logout
        logout_message.append_pair(49, self.sender_comp_id)  # SenderCompID
        logout_message.append_pair(56, self.target_comp_id)  # TargetCompID
        logout_message.append_pair(34, str(self.msg_id))  # MsgSeqNum
        logout_message.append_pair(52, self.get_current_timestamp())  # SendingTime
        return logout_message

    def get_current_timestamp(self):
        # Get the current UTC time
        now = datetime.utcnow()
        # Format the time according to FIX UTCTimestamp requirements
        return now.strftime("%Y%m%d-%H:%M:%S.%f")[:-3]

    def send_heartbeat(self, test_request_id=None):
        try:
            if not self.connected:
                logger.warning("Connection lost. Attempting to reconnect...")
                self.reconnect()
                return

            if not self.sock:
                logger.warning(
                    "Socket is None before sending heartbeat. Reconnecting..."
                )
                self.connected = False
                self.reconnect()
                return

            heartbeat_message = FixMessage()
            heartbeat_message.append_pair(8, "FIX.4.4")  # BeginString
            heartbeat_message.append_pair(35, "0")  # MsgType: Heartbeat
            heartbeat_message.append_pair(49, self.sender_comp_id)  # SenderCompID
            heartbeat_message.append_pair(56, self.target_comp_id)  # TargetCompID
            heartbeat_message.append_pair(34, str(self.msg_id))  # MsgSeqNum
            heartbeat_message.append_pair(
                52, self.get_current_timestamp()
            )  # SendingTime
            if test_request_id is not None:
                heartbeat_message.append_pair(112, test_request_id)  # TestReqID

            self.send(heartbeat_message.encode().decode())
            logger.debug("Sent Heartbeat")

        except Exception as e:
            logger.error(f"Error sending Heartbeat: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            self.connected = False
            self.reconnect()

    def reconnect(self):
        logger.info("Attempting to reconnect to FIX gateway...")
        try:
            self.disconnect()
            time.sleep(5)  # Throttle reconnect attempts
            self.connect()
            if hasattr(self, "username") and hasattr(self, "password"):
                self.logon(self.username, self.password)
            else:
                logger.warning("No stored credentials found for logon after reconnect.")
        except Exception as e:
            logger.error(f"Reconnect attempt failed: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())

    def start_heartbeat_thread(self):
        if (
            hasattr(self, "_heartbeat_thread_running")
            and self._heartbeat_thread_running
        ):
            logger.warning("Heartbeat thread is already running.")
            return

        self._heartbeat_thread_running = True

        def send_heartbeat_task():
            while self.connected:
                time.sleep(self.heartbeat_interval)
                self.send_heartbeat()
            self._heartbeat_thread_running = False

        threading.Thread(target=send_heartbeat_task, daemon=True).start()

    def process_quote_response(self, message):
        try:
            symbol = message.get(55)
            status = message.get(297)  # status
            match status:
                case b"0":
                    logger.info(f"Quote Response for {symbol}: Accepted")

                case b"4":
                    quote_req_id = message.get(131)
                    logger.info(f"Quote Response for {symbol}: Canceled")
                    self.quote_requests.pop(quote_req_id.decode())
                case b"5":
                    reason = message.get(300)  # RejectReason
                    text = message.get(58)  # Text
                    logger.info(
                        f"""Quote Response for {symbol}: Rejected. Reason={
                            reason
                        }, Text={text}"""
                    )
                case b"7":
                    logger.info("Quote Response: Expired")
                case _:
                    logger.warning(f"Unhandled Quote Response status: {status}")
        except Exception as e:
            logger.error(f"Error processing Quote Response: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())

    def process_quote(self, message: FixMessage):
        try:
            quote_req_id = message.get(131)
            if quote_req_id is None:
                logger.warning("No QuoteReqID found in message")
                return
            request_message = self.quote_requests.get(quote_req_id.decode())
            if request_message is None:
                logger.warning(f"No request message found for {quote_req_id.decode()}")
                return
            # logger.info(f"[SPOT] Processing spot quote for {quote_req_id.decode()}")
            symbol = message.get(55)  # Symbol
            security_type = message.get(167)
            settlement_field = message.get(63)
            settlement = (
                settlement_field.decode() if settlement_field is not None else None
            )
            # if message.get(9999)is none try to get from request message
            settlement2 = (
                message.get(9999)
                if message.get(9999) is not None
                else request_message.get(9999)
            )
            timestamp = message.get(52)  # SendingTime
            currency = message.get(15)  # Currency
            fixing_date = message.get(6203)
            # Settlement type
            type = "SPOT"
            if security_type == b"FXNDF":
                if settlement2:
                    type = "NDS"
                    far_leg = settlement2.decode() if settlement2 is not None else ""
                    settlement = f"{settlement}_{far_leg} "
                else:
                    type = "NDF"

            elif settlement in ("SP", "0", "1", "2"):
                type = "SPOT"
            elif settlement2:
                type = "SWAP"
                far_leg = settlement2.decode() if settlement2 is not None else ""
                settlement = f"{settlement}_{far_leg} "
            else:
                type = "FORWARD"

            num_entries_field = message.get(295)
            num_entries = int(num_entries_field) if num_entries_field is not None else 0
            for i in range(1, num_entries + 1):
                quote_id = message.get(299, i)  # QuoteID
                provider = message.get(282, i)  # Provider
                bid_price = message.get(132, i)  # BidPx
                ask_price = message.get(133, i)  # AskPx
                bid_size = message.get(134, i)  # BidSize
                ask_size = message.get(135, i)  # AskSize
                bid_spot = message.get(188, i)
                offer_spot = message.get(190, i)
                bid_fwd = message.get(189, i)
                offer_fwd = message.get(191, i)
                forward_price_bid = message.get(7576, i)  # ForwardPrice
                forward_price_ask = message.get(7577, i)  # ForwardPrice
                forward_price = (
                    forward_price_bid if forward_price_bid else forward_price_ask
                )
                spot_rate = message.get(190, i)
                if type == "NDS":
                    forward_price = bid_spot if bid_spot else offer_spot
                    spot_rate = bid_price if bid_price else ask_price


                side = message.get(54, i)  # Side
                md_entry_type = message.get(269, i)

                depth = message.get(268, i)
                net_price = message.get(631, i)  # NetPrice
                value_date = message.get(64, i)  # SettlDate

                fwd_points = message.get(191, i)
                # [MOD] Filter only valid MDEntryTypes (0 = Bid, 1 = Offer)
                if md_entry_type is None or md_entry_type.decode() not in (
                    "0",
                    "1",
                    "H",
                ):
                    logger.warning(f"Invalid MDEntryType: {md_entry_type}")
                    continue

                entry_type = (
                    md_entry_type.decode() if md_entry_type is not None else "Unknown"
                )
                is_bid = side.decode() != "1" if side is not None else False
                order_qty = (
                    bid_size if bid_size else ask_size
                )  # bid or ask size is the quantity
                self.update_quotes_df(
                    symbol.decode() if symbol is not None else "N/A",
                    type,
                    (currency.decode() if currency is not None else "N/A"),
                    (provider.decode() if provider is not None else "N/A"),
                    (quote_req_id.decode() if quote_req_id is not None else "N/A"),
                    (bid_price.decode() if bid_price is not None else "N/A"),
                    (ask_price.decode() if ask_price is not None else "N/A"),
                    (net_price.decode() if net_price is not None else "N/A"),
                    (forward_price.decode() if forward_price is not None else "N/A"),
                    (spot_rate.decode() if spot_rate is not None else "N/A"),
                    (fwd_points.decode() if fwd_points is not None else "N/A"),
                    (order_qty.decode() if order_qty is not None else "N/A"),
                    (settlement if settlement is not None else "N/A"),
                    side.decode() if side is not None else "N/A",
                    entry_type,
                    depth.decode() if depth is not None else "N/A",
                    (timestamp.decode() if timestamp is not None else None),
                    (quote_id.decode() if quote_id is not None else "N/A"),
                    (value_date.decode() if value_date is not None else "N/A"),
                )
                # Only save to Redis if we have valid data
                if (
                    symbol is not None
                    and provider is not None
                    and timestamp is not None
                ):
                    self.redis_dao.save_exchange_rate(
                        symbol=symbol.decode(),
                        type=type,
                        quantity=order_qty.decode() if order_qty is not None else "N/A",
                        side="Bid" if is_bid else "Ask",
                        settlement=settlement if settlement is not None else "N/A",
                        provider=provider.decode(),
                        timestamp=datetime.strptime(
                            timestamp.decode(), "%Y%m%d-%H:%M:%S.%f"
                        ).strftime("%Y-%m-%d %H-%M-%S"),
                        exchange_rate=(
                            f"{bid_price.decode() if bid_price else (ask_price.decode() if ask_price else 'N/A')}_{forward_price.decode()}"
                            if forward_price
                            else (
                                bid_price.decode()
                                if bid_price
                                else (ask_price.decode() if ask_price else "N/A")
                            )
                        ),
                    )
                if callable(self.on_price_update):
                    self.on_price_update(
                        (symbol.decode() if symbol is not None else "N/A"),
                        type,
                        (currency.decode() if currency is not None else "N/A"),
                        (provider.decode() if provider is not None else "N/A"),
                        (quote_req_id.decode() if quote_req_id is not None else "N/A"),
                        (bid_price.decode() if bid_price is not None else "N/A"),
                        (ask_price.decode() if ask_price is not None else "N/A"),
                        (net_price.decode() if net_price is not None else "N/A"),
                        (
                            forward_price.decode()
                            if forward_price is not None
                            else "N/A"
                        ),
                        (spot_rate.decode() if spot_rate is not None else "N/A"),
                        (fwd_points.decode() if fwd_points is not None else "N/A"),
                        (order_qty.decode() if order_qty is not None else "N/A"),
                        (settlement if settlement is not None else "N/A"),
                        side.decode() if side is not None else "N/A",
                        entry_type,
                        depth.decode() if depth is not None else "N/A",
                        (timestamp.decode() if timestamp is not None else None),
                        (quote_id.decode() if quote_id is not None else "N/A"),
                        (value_date.decode() if value_date is not None else "N/A"),
                    )

        except Exception as e:
            logger.error(f"Error processing Quote: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())

    def log_fix_message(self, direction, message):
        """Log the given FIX message to a file."""
        if self.log_file is None:
            return
        try:
            with open(self.log_file, "a") as log_file:
                log_file.write(
                    f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {direction} - {message}\n"
                )
        except Exception as e:
            logger.error(f"Error logging FIX message: {e}")

    def calculate_near_settl_date(self, settl_type: str, spot_lag_days: int = 2) -> str:
        today = datetime.today()
        spot_date = today + timedelta(days=spot_lag_days)

        if settl_type == "SP":
            return spot_date.strftime("%Y%m%d")

        if settl_type.startswith("M"):
            try:
                months = int(settl_type[1:])
                near_date = spot_date + relativedelta(months=months)
                return near_date.strftime("%Y%m%d")
            except ValueError:
                raise ValueError(f"Invalid month-based SettlType: {settl_type}")

        raise ValueError(f"Unsupported SettlType for date calculation: {settl_type}")

    def request_quote(
        self,
        symbol="EUR/USD",
        quantity="1000000",
        settl_type="SP",
        side="1",
        currency="USD",
        ndf=False,  # -- NDF MOD --
        near_settl_date=None,
    ):
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        try:
            # Create a unique QuoteReqID
            quote_req_id = str(uuid.uuid4())

            # Construct the Quote Request FIX message
            quote_request = FixMessage()
            quote_request.append_pair(8, "FIX.4.4")  # BeginString
            quote_request.append_pair(35, "R")  # MsgType: Quote Request
            quote_request.append_pair(49, self.sender_comp_id)  # SenderCompID
            quote_request.append_pair(56, self.target_comp_id)  # TargetCompID
            quote_request.append_pair(34, str(self.msg_id))  # MsgSeqNum
            quote_request.append_pair(52, self.get_current_timestamp())  # SendingTime
            quote_request.append_pair(131, quote_req_id)  # QuoteReqID

            # Adding NoRelatedSym group (Tag 146) with one entry
            quote_request.append_pair(146, "1")  # NoRelatedSym = 1 (indicating 1 group)
            quote_request.append_pair(55, symbol)  # Symbol (Tag 55)
            quote_request.append_pair(54, side)  # Side (Tag 54)
            quote_request.append_pair(38, quantity)  # OrderQty (Tag 38)
            quote_request.append_pair(63, settl_type)  # SettlType (Tag 63)
            quote_request.append_pair(15, currency)  # Currency (Tag 15)

            # -- BROKEN DATE MOD --
            if settl_type == "B":
                if not near_settl_date:
                    raise ValueError("SettlDate must be provided when SettlType is 'B'")
                quote_request.append_pair(
                    64, near_settl_date
                )  # SettlDate (format: YYYYMMDD)
                if ndf:
                    quote_request.append_pair(6203, near_settl_date)

            # Add NDF SecurityType if requested
            if ndf:
                quote_request.append_pair(167, "FXNDF")  # SecurityType for NDF
                quote_request.append_pair(453, "1")  # NoPartyIDs
                quote_request.append_pair(448, "UBS")  # PartyID
                quote_request.append_pair(447, "D")  # PartyIDSource
                quote_request.append_pair(452, "35")  # PartyRole
                near_settl_date = self.calculate_near_settl_date(settl_type)
                quote_request.append_pair(6203, near_settl_date)
            # Send the message
            self.send(quote_request.encode().decode())
            logger.info(
                (f"Quote request sent for {symbol} with QuoteReqID {quote_req_id}")
            )

            self.quote_requests[quote_req_id] = quote_request
            # Wait for the quote response
            return quote_req_id
        except Exception as e:
            logger.error(f"Error sending Quote Request: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise

    def request_swap_quote(
        self,
        symbol="EUR/USD",
        quantity="1000000",
        near_settl_type="M1",
        far_settl_type="M3",
        side="1",
        currency="USD",
        target_party=None,  # -- NDF MOD --
        ndf=False,  # -- NDF MOD --
        near_settl_date=None,  # -- BROKEN DATE MOD --
        near_fixing_date=None,  # -- NDF MOD --
    ):
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        try:
            quote_req_id = str(uuid.uuid4())

            message = FixMessage()
            message.append_pair(8, "FIX.4.4")
            message.append_pair(35, "R")  # MsgType = Quote Request
            message.append_pair(49, self.sender_comp_id)
            message.append_pair(56, self.target_comp_id)
            message.append_pair(34, str(self.msg_id))
            message.append_pair(52, self.get_current_timestamp())
            message.append_pair(131, quote_req_id)

            message.append_pair(146, "1")  # NoRelatedSym
            message.append_pair(55, symbol)  # Symbol
            message.append_pair(54, side)  # Side
            message.append_pair(38, quantity)  # OrderQty

            message.append_pair(63, near_settl_type)  # Near SettlType
            message.append_pair(15, currency)  # Currency

            # -- BROKEN DATE MOD --
            if near_settl_type == "B":
                if not near_settl_date:
                    raise ValueError("SettlDate must be provided when SettlType is 'B'")
                message.append_pair(64, near_settl_date)  # SettlDate (format: YYYYMMDD)

            # -- NDF MOD --
            if ndf:
                message.append_pair(167, "FXNDF")  # SecurityType
                message.append_pair(6203, near_settl_date)  # Near SettlDate
                message.append_pair(9121, near_fixing_date)  # Near FixingDate

                # Optional targeting
                if target_party:
                    message.append_pair(453, "1")  # NoPartyIDs
                    message.append_pair(448, target_party)
                    message.append_pair(447, "D")  # PartyIDSource = D
                    message.append_pair(452, "35")  # PartyRole = Liquidity Provider

            message.append_pair(9999, far_settl_type)
            message.append_pair(192, quantity)

            self.send(message.encode().decode())

            logger.info(
                f"Swap quote request sent for {symbol} {near_settl_type}->{far_settl_type} "
                f"{'NDF' if ndf else ''} with QuoteReqID {quote_req_id}"
            )

            self.quote_requests[quote_req_id] = message
            return quote_req_id

        except Exception as e:
            logger.error(f"Error sending Swap Quote Request: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise

    def request_esp_prices(
        self,
        symbols=["EUR/USD", "USD/JPY"],
        settl_types=["SP", "TOM", "SNX", "W1", "B"],
        ndf=False,
    ):
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")
        for symbol in symbols:
            for settl_type in settl_types:
                try:
                    mdreq_id = str(uuid.uuid4())
                    market_data_request = FixMessage()
                    market_data_request.append_pair(8, "FIX.4.4")
                    market_data_request.append_pair(35, "V")
                    market_data_request.append_pair(49, self.sender_comp_id)
                    market_data_request.append_pair(56, self.target_comp_id)
                    market_data_request.append_pair(34, str(self.msg_id))
                    market_data_request.append_pair(52, self.get_current_timestamp())
                    market_data_request.append_pair(146, "1")
                    market_data_request.append_pair(262, mdreq_id)
                    market_data_request.append_pair(263, "1")
                    market_data_request.append_pair(264, "10")
                    market_data_request.append_pair(265, "0")
                    market_data_request.append_pair(55, symbol)
                    market_data_request.append_pair(63, settl_type)
                    if ndf:
                        market_data_request.append_pair(167, "FXNDF")

                    if settl_type == "B":
                        # Actual date in YYYYMMDD format in tag 64 (SettlDate)
                        # 15th of the next month
                        today = datetime.today()
                        first_day_next_month = today.replace(day=1) + timedelta(days=32)
                        fifteenth_next_month = first_day_next_month.replace(day=15)

                        # Format as YYYYMMDD for FIX protocol
                        settl_date = fifteenth_next_month.strftime("%Y%m%d")

                        # Append SettlDate (64) only if SettlType is "B"
                        market_data_request.append_pair(64, settl_date)
                    # Store request details for later lookup
                    self.market_data_requests[mdreq_id] = {
                        "symbol": symbol,
                        "settl_type": settl_type,
                        "ndf": ndf,
                    }

                    self.send(market_data_request.encode().decode())
                    logger.info(
                        f"Market Data Request sent for {symbol} with MDReqID {mdreq_id}"
                    )
                except Exception as e:
                    logger.error(f"Error sending Market Data Request for {symbol}: {e}")
                    logger.error("Stack Trace:")
                    logger.error(traceback.format_exc())
                    raise

    def request_esp_prices_batch(
        self,
        symbols=["EUR/USD", "USD/JPY"],
        settl_types=["SP", "TOM", "SNX", "W1", "B"],
        ndf=False,
    ):
        """
        Optimized batch Market Data Request for multiple symbols and settlement types.
        Sends ONE FIX message instead of separate messages for each combination.

        Args:
            symbols: List of currency symbols to request prices for
            settl_types: List of settlement types to request

        Returns:
            mdreq_id: Single Market Data Request ID for the batch request

        Benefits:
            - Reduces network traffic (1 message vs N×M messages)
            - Single MDReqID for easier tracking
            - Better performance and atomic operation
        """
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        try:
            mdreq_id = str(uuid.uuid4())
            market_data_request = FixMessage()

            # Standard FIX headers
            market_data_request.append_pair(8, "FIX.4.4")  # BeginString
            market_data_request.append_pair(35, "V")  # MsgType: Market Data Request
            market_data_request.append_pair(49, self.sender_comp_id)  # SenderCompID
            market_data_request.append_pair(56, self.target_comp_id)  # TargetCompID
            market_data_request.append_pair(34, str(self.msg_id))  # MsgSeqNum
            market_data_request.append_pair(
                52, self.get_current_timestamp()
            )  # SendingTime

            # Market Data Request specific fields
            market_data_request.append_pair(262, mdreq_id)  # MDReqID
            market_data_request.append_pair(
                263, "1"
            )  # SubscriptionRequestType = 1 (snapshot + updates)
            market_data_request.append_pair(264, "10")
            market_data_request.append_pair(265, "0")
            # Calculate total combinations for NoRelatedSym
            total_combinations = len(symbols) * len(settl_types)
            market_data_request.append_pair(
                146, str(total_combinations)
            )  # NoRelatedSym

            # Add each symbol/settlement combination as a repeating group
            for symbol in symbols:
                for settl_type in settl_types:
                    market_data_request.append_pair(55, symbol)  # Symbol
                    market_data_request.append_pair(63, settl_type)  # SettlType
                    if ndf:
                        market_data_request.append_pair(167, "FXNDF")
                    # Handle broken date logic for "B" settlement type
                    if settl_type == "B":
                        today = datetime.today()
                        first_day_next_month = today.replace(day=1) + timedelta(days=32)
                        fifteenth_next_month = first_day_next_month.replace(day=15)
                        settl_date = fifteenth_next_month.strftime("%Y%m%d")
                        market_data_request.append_pair(64, settl_date)  # SettlDate

            # Store batch request details for later lookup
            self.market_data_requests[mdreq_id] = {
                "symbols": symbols,
                "settl_types": settl_types,
                "ndf": ndf,
                "batch": True,
            }

            # Send the single batched request
            self.send(market_data_request.encode().decode())
            logger.info(
                f"Batch Market Data Request sent for {len(symbols)} symbols, "
                f"{len(settl_types)} settlement types ({total_combinations} combinations) "
                f"with MDReqID {mdreq_id}"
            )

            return mdreq_id

        except Exception as e:
            logger.error(f"Error sending Batch Market Data Request: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise

    def process_market_data_snapshot(self, message):
        """
        Process the Market Data Snapshot/Update message and send updates to WebSocket clients.
        """
        try:
            symbol = message.get(55).decode() if message.get(55) is not None else None
            if symbol is None:
                return  # Symbol
            settlement_type = (
                message.get(64).decode() if message.get(64) else None
            )  # Settlement type
            number_of_entries = int(message.get(268).decode())  # Number of entries
            for i in range(1, number_of_entries + 1):
                quote_id = (
                    message.get(278, i).decode() if message.get(278, i) else None
                )  # MDEntryID
                entry_type = (
                    message.get(269, i).decode() if message.get(269, i) else None
                )  # MDEntryType
                price = (
                    message.get(270, i).decode() if message.get(270, i) else None
                )  # Bid price
                quantity = (
                    message.get(271, i).decode() if message.get(271, i) else None
                )  # Ask price
                time_stamp = (
                    message.get(273, i).decode() if message.get(273, i) else None
                )  # TimeStamp
                originator = (
                    message.get(282, i).decode() if message.get(282, i) else None
                )  # Originator
                sec_type = (
                    message.get(167, i).decode() if message.get(167, i) else None
                )  # NDF
                logger.debug(
                    f"Market Data Snapshot for {symbol}: EntryType={entry_type}, Price={price}, Quantity={quantity}, TimeStamp={time_stamp}, Originator={originator}"
                )
                if sec_type == "FXNDF":
                    type = "NDF"
                elif settlement_type in ("SP", "0", "1", "2"):
                    type = "SPOT"
                else:
                    type = "FORWARD"
                # check if all the fields are not None
                if (
                    symbol
                    and entry_type
                    and price
                    and quantity
                    and time_stamp
                    and originator
                ):
                    self.redis_dao.save_exchange_rate(
                        symbol=symbol,
                        type=type,
                        quantity=quantity,
                        side="Bid" if entry_type == "0" else "Ask",
                        settlement=settlement_type,
                        provider=originator,
                        timestamp=datetime.utcfromtimestamp(
                            int(time_stamp) / 1_000_000
                        ).strftime("%Y-%m-%d %H-%M-%S"),
                        exchange_rate=price,
                    )
                if callable(self.on_price_update):
                    self.on_price_update(
                        quote_id,
                        symbol,
                        settlement_type,
                        entry_type,
                        price,
                        quantity,
                        time_stamp,
                        originator,
                    )

        except Exception as e:
            logger.error(f"Error processing Market Data Snapshot: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())

    def handle_reject_message(self, message):
        ref_msg_type = message.get(372).decode() if message.get(372) else "Unknown"
        ref_seq_num = message.get(45).decode() if message.get(45) else "Unknown"
        reason = message.get(373).decode() if message.get(373) else "Unknown reason"
        text = message.get(58).decode() if message.get(58) else "No additional details"
        logger.error(
            f"Received Reject message: RefMsgType={ref_msg_type}, RefSeqNum={ref_seq_num}, Reason={reason}, Details={text}"
        )

    def update_quotes_df(
        self,
        symbol,
        type,
        currency,
        provider,
        quote_req_id,
        bid_price,
        ask_price,
        net_price,
        forward_price,
        spot_price,
        fwd_points,
        order_qty,
        settlement_type,
        side,
        md_entry_type,
        depth,
        timestamp=None,
        quote_id=None,
        value_date=None,
    ):
        """
        Update the quotes DataFrame with a new or updated quote.
        """
        timestamp = timestamp or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        new_row = {
            "quote_req_id": quote_req_id,
            "quote_id": quote_id,  # Default value is None
            "symbol": symbol,
            "type": type,
            "currency": currency,  # Default value is "USD"
            "provider": provider,
            "bid": bid_price,
            "ask": ask_price,
            "net_price": net_price,
            "forward_price": forward_price,
            "spot_price": spot_price,
            "fwd_points": fwd_points,
            "order_qty": order_qty,
            "side": side,
            "md_entry_type": md_entry_type,
            "depth": depth,
            "timestamp": timestamp,
            "settlement_type": settlement_type,  # Default value
            "value_date": value_date,  # Default value is None
        }
        # Ensure the DataFrame columns match the keys in `new_row`
        assert set(new_row.keys()) == set(self.quotes_df.columns), (
            f"Keys in new_row ({new_row.keys()}) do not match DataFrame columns ({self.quotes_df.columns})."
        )

        # Update if exists, else append
        condition = (
            (self.quotes_df["symbol"] == symbol)
            & (self.quotes_df["type"] == type)
            & (self.quotes_df["provider"] == provider)
            & (self.quotes_df["quote_req_id"] == quote_req_id)
            & (self.quotes_df["side"] == side)
            & (self.quotes_df["order_qty"] == order_qty)
        )
        if condition.any():
            for key, value in new_row.items():
                self.quotes_df.loc[condition, key] = value
        else:
            self.quotes_df = pd.concat(
                [self.quotes_df, pd.DataFrame([new_row])],
                ignore_index=True,
            )

    def get_quotes_df(self, symbol):
        """
        Return the quotes DataFrame.
        """
        return self.quotes_df[self.quotes_df["symbol"] == symbol]

    def request_esp_trade(
        self,
        symbol,
        side,
        quantity,
        price=None,
        settl_type="SP",
        trade_conditions=None,
        quote_id=None,
    ):
        """
        Send an ESP trade request (New Order - Single).

        Args:
            symbol (str): The trading symbol, e.g., "EUR/USD".
            side (str): The side of the trade ('1' = Buy, '2' = Sell).
            quantity (str): The order quantity.
            price (str, optional): The price (optional for market orders).
            settl_type (str): The settlement type ('SP' = Spot).
            trade_conditions (str, optional): Trade conditions if any.
        """
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        try:
            # Generate a unique ClOrdID
            cl_ord_id = str(uuid.uuid4())

            # Construct the New Order - Single (D) FIX message
            new_order = FixMessage()
            new_order.append_pair(8, "FIX.4.4")  # BeginString
            new_order.append_pair(35, "D")  # MsgType: New Order - Single
            new_order.append_pair(49, self.sender_comp_id)  # SenderCompID
            new_order.append_pair(56, self.target_comp_id)  # TargetCompID
            new_order.append_pair(34, str(self.msg_id))  # MsgSeqNum
            new_order.append_pair(52, self.get_current_timestamp())  # SendingTime
            new_order.append_pair(11, cl_ord_id)  # ClOrdID
            new_order.append_pair(55, symbol)  # Symbol
            new_order.append_pair(54, side)  # Side
            new_order.append_pair(38, quantity)  # OrderQty
            if price:
                new_order.append_pair(44, price)  # Price (if provided)
            new_order.append_pair(63, settl_type)  # SettlType (Settlement type)
            if quote_id:
                new_order.append_pair(117, quote_id)  # QuoteID (optional)
            if trade_conditions:
                new_order.append_pair(77, trade_conditions)  # TradeCondition (optional)

            # Send the message
            self.send(new_order.encode().decode())
            logger.info(f"ESP trade request sent for {symbol} with ClOrdID {cl_ord_id}")

            # Wait for and process the response
            return
        except Exception as e:
            logger.error(f"Error sending ESP Trade Request: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise

    def request_rfs_trade(
        self,
        symbol,
        side,
        quantity,
        price=None,
        currency="EUR",
        settl_type="SP",
        value_date=None,  # New: Required as per the spec (tag 64)
        quote_id=None,
        quote_req_id=None,
        secondary_order_id=None,  # Optional (tag 693)
        order_capacity="1",  # Optional (tag 694)
        type="SPOT",
    ):
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        try:
            # Generate a unique ClOrdID
            cl_ord_id = str(uuid.uuid4())

            # Construct the Quote Response (AJ) FIX message
            new_order = FixMessage()
            new_order.append_pair(8, "FIX.4.4")  # BeginString
            new_order.append_pair(35, "AJ")  # MsgType: QuoteResponse
            new_order.append_pair(49, self.sender_comp_id)  # SenderCompID
            new_order.append_pair(56, self.target_comp_id)  # TargetCompID
            new_order.append_pair(34, str(self.msg_id))  # MsgSeqNum
            new_order.append_pair(52, self.get_current_timestamp())  # SendingTime
            if type in ["NDF"]:
                new_order.append_pair(167, "FXNDF")  # SecurityType for NDF
                new_order.append_pair(190, price)
                near_settl_date = self.calculate_near_settl_date(settl_type)
                new_order.append_pair(6203, near_settl_date)
            else:
                # new_order.append_pair(11, cl_ord_id)  # ClOrdID
                new_order.append_pair(38, quantity)  # OrderQty
            new_order.append_pair(132, price)
            # Bid Price
            new_order.append_pair(134, price)  # Offer Price
            new_order.append_pair(55, symbol)  # Symbol
            new_order.append_pair(54, side)  # Side
            new_order.append_pair(133, price)
            new_order.append_pair(135, quantity)  # OfferSize

            new_order.append_pair(15, currency)
            # Currency

            new_order.append_pair(60, self.get_current_timestamp())  # TransactTime
            new_order.append_pair(
                63, settl_type
            )  # SettlType (should match QuoteRequest)

            if value_date:
                new_order.append_pair(64, value_date)  # Value Date (from MassQuote)

            if quote_id:
                new_order.append_pair(117, quote_id)  # QuoteID

            if quote_req_id:
                new_order.append_pair(131, quote_req_id)  # QuoteReqID

            if secondary_order_id:
                new_order.append_pair(693, secondary_order_id)  # SecondaryOrderID
            else:
                new_order.append_pair(693, cl_ord_id)  # Use ClOrdID if none provided

            new_order.append_pair(694, order_capacity)  # OrderCapacity

            # Send the message
            self.send(new_order.encode().decode())
            logger.info(
                f"RFS `trade request sent for` {symbol} with ClOrdID {cl_ord_id}, QuoteID {quote_id}"
            )

        except Exception as e:
            logger.error(f"Error sending RFS Trade Request: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise

    def request_rfs_swap_trade(
        self,
        symbol,
        side,
        total_quantity,
        spot_price,
        forward_price,
        near_date,
        far_date,
        quote_id,
        quote_req_id,
        trade_request_id,
        trade_request_side,
        currency="USD",
        settlement_type="M1_M3",
        type="SWAP",
    ):
        """
        Submit an RFS swap trade (near and far leg).

        Args:
            symbol (str): Currency pair
            side (str): '1' = Buy, '2' = Sell
            total_quantity (str): Notional for each leg
            spot_price (str): Near leg price
            forward_price (str): Far leg price
            near_date (str): Value date (YYYYMMDD) for near leg
            far_date (str): Value date (YYYYMMDD) for far leg
            quote_id (str): QuoteID
            quote_req_id (str): QuoteReqID
            allocations (list): Not used in this method yet
            trade_request_id (str): Client-provided trade ID
            trade_request_side (str): Optional
            currency (str): Default 'USD'
        """
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        try:
            cl_ord_id = str(uuid.uuid4())

            msg = FixMessage()
            msg.append_pair(8, "FIX.4.4")
            msg.append_pair(35, "AJ")  # QuoteResponse
            leg_tokens = settlement_type.strip().split("_")
            # security_id = f"{symbol.upper()}.SWP.{leg_tokens[0]}.{leg_tokens[1]}"
            # msg.append_pair(48, security_id)  # Use actual SecurityID from the quote
            # msg.append_pair(22, "8")  # 8 = Far Leg
            msg.append_pair(49, self.sender_comp_id)
            msg.append_pair(56, self.target_comp_id)
            msg.append_pair(34, str(self.msg_id))
            msg.append_pair(52, self.get_current_timestamp())

            msg.append_pair(693, cl_ord_id)  # ClOrdID
            msg.append_pair(55, symbol)
            msg.append_pair(54, side)
            # msg.append_pair(38, total_quantity)
            msg.append_pair(135, total_quantity)  # OfferSize

            msg.append_pair(15, currency)
            if side == "1":
                msg.append_pair(132, spot_price)  # BidPx
            else:
                msg.append_pair(133, spot_price)  # AskPx (redundant) (redundant)
            if type.upper() == "SWAP":
                msg.append_pair(6052, spot_price)  # SpotPrice
                msg.append_pair(6053, total_quantity)  # SpotPrice
                msg.append_pair(6162, spot_price)  # SpotPrice

            msg.append_pair(60, self.get_current_timestamp())
            msg.append_pair(63, leg_tokens[0])  # M1
            if type.upper() == "SWAP":
                msg.append_pair(9999, leg_tokens[1])
            msg.append_pair(64, near_date)  # Custom tag for far leg

            msg.append_pair(190, "1")  # Far Leg
            # msg.append_pair(192, total_quantity)  # Far Leg quantity
            msg.append_pair(193, far_date)  # Far Leg date
            msg.append_pair(6203, near_date)

            # msg.append_pair(2000, far_date)  # Custom tag for far leg date
            if type.upper() == "NDS":
                msg.append_pair(167, "FXNDF")  # SecurityType for NDS
                # msg.append_pair(190, spot_price)  # Price (using spot_price for NDS)
                # msg.append_pair(6203, near_date)  # Near settlement date for NDS
                msg.append_pair(9121, far_date)  # Far settlement date for NDS

            msg.append_pair(134, forward_price)  # OfferPx (for far leg)
            if type.upper() == "SWAP":
                msg.append_pair(6163, forward_price)  # Far Leg
                msg.append_pair(7576, forward_price)
                msg.append_pair(7577, forward_price)
            msg.append_pair(
                188, str(float(forward_price) - float(spot_price))
            )  # BidForwardPoints
            msg.append_pair(
                189, str(float(forward_price) - float(spot_price))
            )  # OfferForwardPoints (redundant)
            if quote_id:
                msg.append_pair(117, quote_id)
            if quote_req_id:
                msg.append_pair(131, quote_req_id)
            if trade_request_id:
                msg.append_pair(693, trade_request_id)
            if trade_request_side:
                msg.append_pair(694, trade_request_side)

            self.send(msg.encode().decode())
            logger.info(
                f"Swap RFS trade request sent for {symbol}, ClOrdID={cl_ord_id}"
            )

        except Exception as e:
            logger.error(f"Error sending RFS Swap Trade Request: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())

    def send_gap_fill(
        self,
        start_seq,
        new_seq,
    ):
        """
        Sends a FIX Gap Fill (MsgType=4) message to the counterparty.

        :param start_seq: The first missing sequence number that is being skipped.
        :param new_seq: The next valid sequence number to continue from.
        """
        if not self.connected:
            raise ConnectionError("Not connected to FIX gateway")

        try:
            # Construct the Gap Fill (Sequence Reset) FIX message
            gap_fill = FixMessage()
            gap_fill.append_pair(8, "FIX.4.4")  # BeginString
            gap_fill.append_pair(35, "4")  # MsgType: Sequence Reset (Gap Fill)
            gap_fill.append_pair(49, self.sender_comp_id)  # SenderCompID
            gap_fill.append_pair(56, self.target_comp_id)  # TargetCompID
            gap_fill.append_pair(34, str(start_seq))  # MsgSeqNum (start of gap)
            gap_fill.append_pair(52, self.get_current_timestamp())  # SendingTime
            gap_fill.append_pair(123, "Y")  # GapFillFlag = Y
            gap_fill.append_pair(36, str(new_seq))  # NewSeqNo (the next valid sequence)

            # Send the message
            self.send(gap_fill.encode().decode())

            logger.info(
                f"📤 Sent FIX Gap Fill from {start_seq} to {new_seq} (NewSeqNo={new_seq})"
            )

        except Exception as e:
            logger.error(f"Error sending Gap Fill: {e}")
            logger.error("Stack Trace:")
            logger.error(traceback.format_exc())
            raise
