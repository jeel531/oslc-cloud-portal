# pyrefly: ignore-errors
# type: ignore
"""
OSLC Stock Report - Configuration
Direct connection to DigiCorp SQL Server database.
"""
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class DBConfig:
    server: str = os.getenv("OSLC_DIGI_SERVER", "103.118.17.67,3595")
    database: str = os.getenv("OSLC_DIGI_DATABASE", "DigiBizz_PROD_Om_Sai_Trans_2026_27")
    username: str = os.getenv("OSLC_DIGI_USERNAME", "_DigiCorp_OmSai")
    password: str = os.getenv("OSLC_DIGI_PASSWORD", "1h9vMK_U9!@DigiOmSaiCorp@#2021#")
    driver: str = os.getenv("OSLC_DIGI_DRIVER", "ODBC Driver 17 for SQL Server")
    timeout: int = 15

    @property
    def connection_string(self) -> str:
        # Detect available driver
        import pyodbc
        available = pyodbc.drivers()
        drv = self.driver
        if drv not in available:
            for cand in ["SQL Server", "ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server"]:
                if cand in available:
                    drv = cand
                    break
        return (
            f"DRIVER={{{drv}}};"
            f"SERVER={self.server};"
            f"DATABASE={self.database};"
            f"UID={self.username};"
            f"PWD={self.password};"
            f"TrustServerCertificate=yes;"
        )

SERVER_PORT = 8056
SERVER_HOST = "0.0.0.0"
APP_NAME = "OSLC STOCK REPORT"
APP_VERSION = "2.0.0"
CREATED_BY = "Jeel Vaghani"

