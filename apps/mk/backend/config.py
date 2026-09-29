"""
OSLC CHEKING - Configuration
Connects directly to the live Digi SQL Server database.
"""
from dataclasses import dataclass

@dataclass(frozen=True)
class DBConfig:
    driver: str = "{SQL Server}"
    server: str = "103.118.17.67,3595"
    database: str = "DigiBizz_PROD_Om_Sai_Trans_2026_27"
    username: str = "_oslc_report-user"
    password: str = "_oslc_report-user@Abc@#123#"
    timeout: int = 15

    @property
    def connection_string(self) -> str:
        return (
            f"DRIVER={self.driver};"
            f"SERVER={self.server};"
            f"DATABASE={self.database};"
            f"UID={self.username};"
            f"PWD={self.password};"
        )

SERVER_PORT = 8055
SERVER_HOST = "0.0.0.0"
APP_NAME = "OSLC CHEKING"
APP_VERSION = "1.0.0"
