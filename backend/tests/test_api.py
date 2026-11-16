from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_maps_endpoints():
    # 1. List maps
    resp = client.get("/api/maps")
    assert resp.status_code == 200
    maps = resp.json()
    assert len(maps) >= 1
    assert any(m["id"] == "selu_campus" for m in maps)

    # 2. Get specific map
    resp_map = client.get("/api/maps/selu_campus")
    assert resp_map.status_code == 200
    map_data = resp_map.json()
    assert map_data["id"] == "selu_campus"
    assert len(map_data["lots"]) > 0
    assert len(map_data["roads"]) > 0
    assert len(map_data["buildings"]) > 0

    # 3. Config endpoints
    resp_p = client.get("/api/maps/config/permits")
    assert resp_p.status_code == 200
    assert "freshman" in resp_p.json()["permits"]

    resp_d = client.get("/api/maps/config/difficulty")
    assert resp_d.status_code == 200
    assert "1" in resp_d.json()["levels"]


def test_player_and_runs_flow():
    # 1. Get player (auto creates cookie)
    resp = client.get("/api/player")
    assert resp.status_code == 200
    player_data = resp.json()
    assert "id" in player_data
    player_id = player_data["id"]

    # 2. Start a run
    start_payload = {
        "map_id": "selu_campus",
        "permit_type": "freshman",
        "difficulty": 1,
        "destination_building": "bldg_fayard",
    }
    resp_start = client.post("/api/runs", json=start_payload)
    assert resp_start.status_code == 200
    run_data = resp_start.json()
    assert run_data["id"] is not None
    assert run_data["player_id"] == player_id
    run_id = run_data["id"]

    # 3. Submit 10Hz telemetry batch
    telem_payload = {
        "samples": [
            {
                "t": 0.1,
                "speed_mph": 12.5,
                "steering_angle": 0.05,
                "throttle": 0.8,
                "brake": 0.0,
                "x": 1200.0,
                "y": 155.0,
                "heading": 90.0,
                "lane_offset": 0.1,
            },
            {
                "t": 0.2,
                "speed_mph": 14.8,
                "steering_angle": 0.02,
                "throttle": 0.85,
                "brake": 0.0,
                "x": 1200.0,
                "y": 162.0,
                "heading": 90.0,
                "lane_offset": 0.05,
            },
        ]
    }
    resp_telem = client.post(f"/api/runs/{run_id}/telemetry", json=telem_payload)
    assert resp_telem.status_code == 200
    assert resp_telem.json()["saved_samples"] == 2

    # 4. Log event
    event_payload = {
        "t": 0.2,
        "event_type": "speed_check",
        "details": {"speed_mph": 14.8, "limit_mph": 20.0, "status": "legal"},
    }
    resp_event = client.post(f"/api/runs/{run_id}/events", json=event_payload)
    assert resp_event.status_code == 200

    # 5. Finish the run
    finish_payload = {
        "result": "parked",
        "time_to_park": 45.2,
        "strikes": 0,
        "alignment_offset": 0.08,
    }
    resp_finish = client.post(f"/api/runs/{run_id}/finish", json=finish_payload)
    assert resp_finish.status_code == 200
    finished_data = resp_finish.json()
    assert finished_data["score"] > 0
    assert finished_data["result"] == "parked"

    # 6. Verify player stats updated
    resp_p2 = client.get("/api/player")
    assert resp_p2.status_code == 200
    assert resp_p2.json()["runs_played"] >= 1
    assert resp_p2.json()["best_score"] > 0

    # 7. Export CSV
    resp_csv = client.get(f"/api/runs/{run_id}/export.csv")
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers["content-type"]
    csv_text = resp_csv.text
    assert "timestamp_s" in csv_text
    assert "14.8" in csv_text


def test_finish_returns_score_breakdown():
    run = client.post("/api/runs", json={"map_id": "selu_campus", "permit_type": "freshman", "difficulty": 2}).json()
    resp = client.post(
        f"/api/runs/{run['id']}/finish",
        json={"result": "parked", "time_to_park": 40, "strikes": 1, "alignment_offset": 0.2},
    )
    assert resp.status_code == 200
    body = resp.json()
    items = body["score_breakdown"]
    labels = [i["label"] for i in items]
    assert labels[0] == "Parked legally"
    assert any(l.startswith("Difficulty") for l in labels)
    # Line items add up to the final score
    assert sum(i["points"] for i in items) == body["score"]

    # Run history lists the finished run
    history = client.get("/api/runs").json()
    assert any(r["id"] == run["id"] and r["result"] == "parked" for r in history)


def test_map_editor_save_roundtrip(tmp_path, monkeypatch):
    import shutil
    from app.services import map_loader

    shutil.copy(map_loader.MAPS_DIR / "selu_campus.json", tmp_path / "selu_campus.json")
    monkeypatch.setattr(map_loader, "MAPS_DIR", tmp_path)
    map_loader._map_cache.clear()
    map_loader._map_mtime.clear()

    data = client.get("/api/maps/selu_campus").json()
    assert data["zones"] == []
    assert data["use_legacy_collision_tiles"] is True
    assert data["lots"][0].get("permit_type")  # extra fields survive the schema

    data["zones"] = [{"id": "z_test", "type": "solid", "polygon": [[0, 0], [10, 0], [10, 10]], "name": "Test wall"}]
    data["use_legacy_collision_tiles"] = False
    resp = client.put("/api/maps/selu_campus", json=data)
    assert resp.status_code == 200, resp.text
    assert (tmp_path / "selu_campus.json.bak").exists()

    reloaded = client.get("/api/maps/selu_campus").json()
    assert reloaded["zones"][0]["id"] == "z_test"
    assert reloaded["use_legacy_collision_tiles"] is False
    assert reloaded["lots"][0]["permit_type"] == data["lots"][0]["permit_type"]

    # Bad zone type and too few points are rejected, and the file is left alone
    bad = dict(data, zones=[{"id": "z_bad", "type": "lava", "polygon": [[0, 0], [1, 1], [2, 0]]}])
    assert client.put("/api/maps/selu_campus", json=bad).status_code == 422
    bad = dict(data, zones=[{"id": "z_bad", "type": "grass", "polygon": [[0, 0], [1, 1]]}])
    assert client.put("/api/maps/selu_campus", json=bad).status_code == 422
    assert client.put("/api/maps/other_id", json=data).status_code == 400
    assert client.get("/api/maps/selu_campus").json()["zones"][0]["id"] == "z_test"

    map_loader._map_cache.clear()
    map_loader._map_mtime.clear()
