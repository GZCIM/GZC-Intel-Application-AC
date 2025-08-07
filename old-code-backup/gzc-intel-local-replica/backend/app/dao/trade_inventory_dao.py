from sqlalchemy import text
import pandas as pd


class TradeInventoryDAO:
    def __init__(self, engine):
        """Initialize with a database connection."""
        self.engine = engine
        self.con = engine.connect()

    # SELECT [Id]
    #       ,[TradeId]
    #       ,[TradeDate]
    #       ,[TradeType]
    #       ,[BaseCurrency]
    #       ,[QuoteCurrency]
    #       ,[QuoteType]
    #       ,[ExpirationOrMaturityDate]
    #       ,[OriginalId]
    #       ,[TradeEvent]
    #       ,[Fund]
    #       ,[Position]
    #       ,[Trader]
    #       ,[ModUser]
    #       ,[ModTimestamp]
    #   FROM [PFL].[Tbl_Trade_Inventory] table structure
    def insert_virtual_trade_to_inventory(
        self,
        trade_id,
        trade_date,
        symbol,
        expiration_or_maturity_date,
        original_id,
        trade_event,
        fund,
        position,
        trader,
        mod_user,
    ):
        """Insert a virtual trade into the inventory table
        and return inserted row."""
        # SQL Insert Statement
        insert_sql = text(
            """
            INSERT INTO [PFL].[Tbl_Trade_Inventory]
                    (TradeId,
                    TradeDate,
                    TradeType,
                    BaseCurrency,
                    QuoteCurrency,
                    QuoteType,
                    ExpirationOrMaturityDate,
                    OriginalId,
                    TradeEvent,
                    Fund,
                    Position,
                    Trader,
                    ModUser,
                    ModTimestamp)
                OUTPUT INSERTED.Id
                VALUES
                    (:trade_id,
                    :trade_date,
                    :trade_type_id,
                    :base_currency,
                    :quote_currency,
                    :quote_type,
                    :expiration_or_maturity_date,
                    :original_id,
                    :trade_event,
                    :fund,
                    :position,
                    :trader,
                    :mod_user,
                    GETDATE())
                """
        )
        select_sql = text(
            """
                SELECT  [Id]
            ,[TradeId]
            ,[TradeDate]
            ,[TradeType]
            ,[BaseCurrency]
            ,[QuoteCurrency]
            ,[QuoteType]
            ,[ExpirationOrMaturityDate]
            ,[OriginalId]
            ,[TradeEvent]
            ,[Fund]
            ,[Position]
            ,[Trader]
            ,[ModUser]
            ,[ModTimestamp] FROM [PFL].[Tbl_Trade_Inventory]
            WHERE Id = :last_inserted_id;
                """
        )
        # split the symbol to base and quote currency
        base_currency, quote_currency = symbol.split("/")
        # check from [PFL].[Tbl_Quote_Type_Convention] table if quote_type
        # is default =1 or reversed =2
        # if 2 then reverse the base and quote currency
        quote_type_sql = text(
            """
            SELECT [QuoteType]
            FROM [PFL].[Tbl_Quote_Type_Convention]
            WHERE[BaseCurrency] = :base_currency
            AND [QuoteCurrency] = :quote_currency
            """
        )

        trade_type_sql = text(
            """
        SELECT TOP (1) Id FROM [PFL].[Tbl_Trade_Type]
        WHERE Name = 'Virtual FX'
        """
        )

        with self.con.begin():
            # Execute the SQL Query
            quote_type = self.con.execute(
                quote_type_sql,
                {
                    "base_currency": base_currency,
                    "quote_currency": quote_currency,
                },
            ).scalar()
            if quote_type == 2:
                base_currency, quote_currency = (
                    quote_currency,
                    base_currency,
                )
            trade_type_id = self.con.execute(trade_type_sql).scalar()
            # Execute the SQL Insert Statement
            result = self.con.execute(
                insert_sql,
                {
                    "trade_id": trade_id,
                    "trade_date": trade_date,
                    "trade_type_id": trade_type_id,
                    "base_currency": base_currency,
                    "quote_currency": quote_currency,
                    "quote_type": quote_type,
                    "expiration_or_maturity_date": expiration_or_maturity_date,
                    "original_id": original_id,
                    "trade_event": trade_event,
                    "fund": fund,
                    "position": position,
                    "trader": trader,
                    "mod_user": mod_user,
                },
            )
            last_inserted_id = result.scalar()
            # SQL Query to Retrieve the Inserted Row

            # Execute the SQL Query
            df = pd.read_sql_query(
                select_sql,
                self.con,
                params={"last_inserted_id": last_inserted_id},
            )

        return df
