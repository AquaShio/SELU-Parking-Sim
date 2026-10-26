from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./parksim.db"
    frontend_origin: str = "http://localhost:5173"
    cookie_name: str = "parksim_player"
    cookie_max_age_days: int = 365

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
