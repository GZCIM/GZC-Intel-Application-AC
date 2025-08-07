from sqlalchemy import text
import pandas as pd


class VirtiualFxTradeDAO:
    def __init__(self, engine):
        """Initialize with a database connection."""
        self.engine = engine
        self.con = engine.connect()

    # SELECT TOP (1000) [Id]
    #       ,[ExecutionID]
    #       ,[OrderID]
    #       ,[Symbol]
    #       ,[Side]
    #       ,[OrderQty]
    #       ,[Price]
    #       ,[TradeDate]
    #       ,[SettlDate]
    #       ,[Currency]
    #       ,[CounterpartyID]
    #       ,[FundId]
    #       ,[Trader]
    #       ,[Note]
    #       ,[ModUser]
    #       ,[ModTimestamp]
    # FROM [VRT].[Tbl_FX_Trade] table structure

    def insert_virtual_fx_trade(
        self,
        execution_id,  # Can be NULL
        order_id,
        symbol,
        side,
        order_qty,
        price,
        trade_date,
        settl_date,
        currency,
        counterparty_id,
        fund_id,
        trader,
        note,
        mod_user,
    ):
        """Insert a new virtual FX trade and return the exact inserted row using SCOPE_IDENTITY()."""

        # SQL Insert Statement
        insert_sql = text(
            """
            INSERT INTO VRT.Tbl_FX_Trade (
                ExecutionID,
                OrderID,
                Symbol,
                Side,
                OrderQty,
                Price,
                TradeDate,
                SettlDate,
                Currency,
                CounterpartyID,
                FundId,
                Trader,
                Note,
                ModUser,
                ModTimestamp
            )
            OUTPUT INSERTED.Id
            VALUES (
                :execution_id,
                :order_id,
                :symbol,
                :side,
                :order_qty,
                :price,
                :trade_date,
                :settl_date,
                :currency,
                :counterparty_id,
                :fund_id,
                :trader,
                :note,
                :mod_user,
                GETDATE()
            );
            """
        )

        # SQL Query to Retrieve the Inserted Row
        select_sql = text(
            """
            SELECT * FROM VRT.Tbl_FX_Trade WHERE Id = :last_inserted_id;
            """
        )

        with self.con.begin():
            # Convert None to SQL NULL
            execution_id_value = execution_id if execution_id else None

            # Execute INSERT and fetch last inserted ID
            result = self.con.execute(
                insert_sql,
                {
                    "execution_id": execution_id_value,
                    "order_id": order_id,
                    "symbol": symbol,
                    "side": side,
                    "order_qty": order_qty,
                    "price": price,
                    "trade_date": trade_date,
                    "settl_date": settl_date,
                    "currency": currency,
                    "counterparty_id": counterparty_id,
                    "fund_id": fund_id,
                    "trader": trader,
                    "note": note,
                    "mod_user": mod_user,
                },
            )

            # Get the last inserted ID
            last_inserted_id = result.scalar()

            # Fetch the inserted row and return as a DataFrame
            df = pd.read_sql_query(
                select_sql,
                self.con,
                params={"last_inserted_id": last_inserted_id},
            )

        return df


