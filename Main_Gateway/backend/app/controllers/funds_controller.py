from fastapi import APIRouter, HTTPException, Depends
from app.auth.azure_auth import validate_token
from app.daos.funds_dao import FundsDAO


router = APIRouter(prefix="/api/db", tags=["Funds"])


@router.get("/funds", status_code=200)
def list_funds(current_user: dict = Depends(validate_token)):
    try:
        data = FundsDAO().list_funds()
        return {"status": "ok", "count": len(data), "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


