# Maps

One JSON file per map (e.g. `selu_north_campus.json`). The shape must match
`MapOut` in `app/schemas/map.py`. The front end gets it from `GET /api/maps/{id}`.

Coordinates are in world units (pick one: 1 unit = 1 foot is easy to reason about).
