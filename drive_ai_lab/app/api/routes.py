from __future__ import annotations

import json
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
_MAP_PATH = os.path.join(_DATA_DIR, "map.json")


class MapPayload(BaseModel):
    width: int = Field(..., ge=4, le=200)
    height: int = Field(..., ge=4, le=200)
    tileSize: int = Field(32, ge=8, le=128)
    tiles: list[list[int]]
    name: str | None = None

    def validate_shape(self) -> None:
        if len(self.tiles) != self.height:
            raise HTTPException(status_code=400, detail="tiles height mismatch")
        for row in self.tiles:
            if len(row) != self.width:
                raise HTTPException(status_code=400, detail="tiles width mismatch")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config")
async def config() -> dict[str, Any]:
    return {
        "populationSize": 80,
        "sensorCount": 7,
        "sensorSpread": 1.6,
        "sensorRange": 220,
        "hiddenSize": 16,
        "mutationRate": 0.15,
        "mutationStrength": 0.25,
        "maxSpeed": 3.2,
        "acceleration": 0.18,
        "friction": 0.04,
        "turnSpeed": 0.045,
        "tileSize": 32,
        "mapWidth": 24,
        "mapHeight": 16,
        "maxSteps": 1400,
        "goalReward": 1000,
    }


@router.get("/map")
async def get_map() -> dict[str, Any]:
    if not os.path.exists(_MAP_PATH):
        raise HTTPException(status_code=404, detail="no saved map")
    with open(_MAP_PATH, encoding="utf-8") as f:
        return json.load(f)


@router.post("/map")
async def save_map(payload: MapPayload) -> dict[str, Any]:
    payload.validate_shape()
    os.makedirs(_DATA_DIR, exist_ok=True)
    data = payload.model_dump()
    with open(_MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return {"status": "ok", "savedTo": _MAP_PATH}
