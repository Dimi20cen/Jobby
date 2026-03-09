from app.api.routes import health


def test_health() -> None:
    response = health()
    assert response.status == "ok"
