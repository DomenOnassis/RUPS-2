from getpass import getuser
from fastapi import APIRouter, Depends, HTTPException
from schemas.circuit import CircuitCreate
from models.circuit import Circuit
from crud.circuit import create_circuit, get_circuits, get_circuit_by_id, delete_circuit
from typing import List
from routers.auth import get_current_user
from models.user import User


router = APIRouter(prefix="/circuits", tags=["circuits"])

@router.post("/")
def create_circuit_endpoint(body: CircuitCreate, user: User = Depends(get_current_user)):
    return create_circuit(
        user_id=user.id,
        name=body.name,
        data={"components": body.components}
    )


@router.get("/", response_model=List[Circuit])
def list_circuits(current_user=Depends(get_current_user)):
    return get_circuits(current_user.id)

@router.get("/{circuit_id}", response_model=Circuit)
def load_circuit(circuit_id: int, current_user=Depends(get_current_user)):
    circuit = get_circuit_by_id(circuit_id, current_user.id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return circuit


@router.delete("/{circuit_id}")
def remove_circuit(circuit_id: int, current_user=Depends(get_current_user)):
    success = delete_circuit(circuit_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return {"detail": "Circuit deleted"}