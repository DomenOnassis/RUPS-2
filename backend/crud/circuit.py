from sqlmodel import Session, select
from database import engine
from models.circuit import Circuit

def create_circuit(user_id: int, name: str, data: dict) -> Circuit:
    with Session(engine) as session:
        circuit = Circuit(user_id=user_id, name=name, data=data)
        session.add(circuit)
        session.commit()
        session.refresh(circuit)
        return circuit

def get_circuits(user_id: int) -> list[Circuit]:
    with Session(engine) as session:
        statement = select(Circuit).where(Circuit.user_id == user_id)
        return session.exec(statement).all()

def get_circuit_by_id(circuit_id: int, user_id: int) -> Circuit | None:
    with Session(engine) as session:
        statement = select(Circuit).where(Circuit.id == circuit_id, Circuit.user_id == user_id)
        return session.exec(statement).first()

def delete_circuit(circuit_id: int, user_id: int) -> bool:
    with Session(engine) as session:
        circuit = get_circuit_by_id(circuit_id, user_id)
        if not circuit:
            return False
        session.delete(circuit)
        session.commit()
        return True
