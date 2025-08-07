import redis
import json


class RedisDAO:

    def __init__(
        self,
        quote_type="ESP",
        host="localhost",
        port=6379,
        db=0,
        password=None,
        ssl=False,
    ):
        self.redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            decode_responses=True,
            password=password,
            ssl=ssl,
        )
        self.quote_type = quote_type

    def save_exchange_rate(
        self,
        symbol,
        type,
        quantity,
        side,
        settlement,
        provider,
        timestamp,
        exchange_rate,
    ):
        key = (
            f"exchange_rate:{self.quote_type}:{symbol}:{type}:{quantity}:"
            f"{side}:{settlement}:{provider}"
        )
        value = json.dumps(
            {"rate": exchange_rate, "timestamp": timestamp}
        )

        self.redis.set(key, value)

    def get_exchange_rate(
        self,
        symbol,
        type,
        quantity,
        side,
        settlement,
        provider,
    ):
        key = f"exchange_rate:{self.quote_type}:{symbol}:{type}:{quantity}:{side}:{settlement}:{provider}"
        value = self.redis.get(key)
        if value:
            return json.loads(value)
        return None

    def delete_exchange_rate(
        self,
        symbol,
        type,
        quantity,
        side,
        settlement,
        provider,
    ):
        key = f"exchange_rate:{self.quote_type}:{symbol}:{type}:{quantity}:{side}:{settlement}:{provider}"
        self.redis.delete(key)
        print(f"🗑️ Deleted: {key}")

    def get_all_exchange_rates(self):
        keys = self.redis.keys("exchange_rate:*")
        exchange_rates = {}
        for key in keys:
            value = self.redis.get(key)
            (
                quote_type,
                symbol,
                type,
                quantity,
                side,
                settlement,
                provider,
            ) = key.split(":")[1:]
            exchange_rates[key] = json.loads(value)

        return exchange_rates
