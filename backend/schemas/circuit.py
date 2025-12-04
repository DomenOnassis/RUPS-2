from pydantic import BaseModel
from typing import List, Dict, Any

class CircuitCreate(BaseModel):
    name: str
    components: List[Dict[str, Any]]
