from sqlmodel import SQLModel, Session, create_engine, select
from models.challenge import Challenge


DATABASE_URL = "sqlite:///./database.db"
engine = create_engine(DATABASE_URL, echo=True)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    seed_challenges()

def seed_challenges():
    with Session(engine) as session:
        existing = session.exec(select(Challenge)).first()
        if existing:
            return

        challenges = [
            Challenge(
                id=1,
                title="Simple Circuit",
                description="Connect the battery to the bulb using wires",
                workspace_type="electric",
                difficulty=1,
                requirements={"bulbs": 1, "batteries": 1}
            ),
            Challenge(
                id=2,
                title="Open Circuit",
                description="Build an open circuit with switch OFF",
                workspace_type="electric",
                difficulty=2,
                requirements={"bulbs": 1, "batteries": 1, "switches": 1}
            ),
            Challenge(
                id=3,
                title="Closed Circuit",
                description="Build a closed circuit with switch ON",
                workspace_type="electric",
                difficulty=2,
                requirements={"bulbs": 1, "batteries": 1, "switches": 1}
            ),
            Challenge(
                id=4,
                title="Switch Control",
                description="Add a switch you can turn on/off",
                workspace_type="electric",
                difficulty=3,
                requirements={"bulbs": 1, "batteries": 1, "switches": 1}
            ),
            Challenge(
                id=5,
                title="Series Batteries",
                description="Connect two batteries in series with the bulb",
                workspace_type="electric",
                difficulty=4,
                requirements={"bulbs": 1, "batteries": 2}
            ),
            Challenge(
                id=6,
                title="Series Bulbs",
                description="Connect two bulbs in series to the battery",
                workspace_type="electric",
                difficulty=5,
                requirements={"bulbs": 2, "batteries": 1}
            ),
            Challenge(
                id=7,
                title="Parallel Bulbs",
                description="Connect two bulbs in parallel to the battery",
                workspace_type="electric",
                difficulty=6,
                requirements={"bulbs": 2, "batteries": 1}
            ),
            Challenge(
                id=8,
                title="Resistor Circuit",
                description="Connect battery, resistor, and bulb in a complete circuit",
                workspace_type="electric",
                difficulty=7,
                requirements={"bulbs": 1, "batteries": 1, "resistors": 1}
            ),
            Challenge(
                id=9,
                title="Complex Series",
                description="Connect battery, two resistors, and bulb in series",
                workspace_type="electric",
                difficulty=8,
                requirements={"bulbs": 1, "batteries": 1, "resistors": 2}
            ),
            Challenge(
                id=10,
                title="Mixed Circuit",
                description="Combine series and parallel connections with multiple bulbs",
                workspace_type="electric",
                difficulty=9,
                requirements={"bulbs": 3, "batteries": 1}
            ),
            Challenge(
                id=11,
                title="AND Gate",
                description="Add inputs to get output: 1",
                workspace_type="logic",
                difficulty=1,
                requirements={"gates": ["AND"]}
            ),
            Challenge(
                id=12,
                title="OR Gate",
                description="Add inputs to get output: 0",
                workspace_type="logic",
                difficulty=1,
                requirements={"gates": ["OR"]}
            ),
            Challenge(
                id=13,
                title="NOT Gate",
                description="Add input to get output: 0",
                workspace_type="logic",
                difficulty=2,
                requirements={"gates": ["NOT"]}
            ),
            Challenge(
                id=14,
                title="NAND Gate",
                description="Add inputs to get output: 1",
                workspace_type="logic",
                difficulty=2,
                requirements={"gates": ["NAND"]}
            ),
            Challenge(
                id=15,
                title="NOR Gate",
                description="Add inputs to get output: 1",
                workspace_type="logic",
                difficulty=3,
                requirements={"gates": ["NOR"]}
            ),
            Challenge(
                id=16,
                title="XOR Gate",
                description="Add inputs to get output: 1",
                workspace_type="logic",
                difficulty=3,
                requirements={"gates": ["XOR"]}
            ),
            Challenge(
                id=17,
                title="XNOR Gate",
                description="Add inputs to get output: 0",
                workspace_type="logic",
                difficulty=4,
                requirements={"gates": ["XNOR"]}
            ),
            Challenge(
                id=18,
                title="Complex Circuit",
                description="Add 4 inputs to get output: 1",
                workspace_type="logic",
                difficulty=6,
                requirements={"gates": ["AND", "OR"]}
            ),
            Challenge(
                id=19,
                title="NOT-AND Circuit",
                description="Add 2 inputs to get output: 0",
                workspace_type="logic",
                difficulty=7,
                requirements={"gates": ["NOT", "AND"]}
            ),
            Challenge(
                id=20,
                title="Advanced XOR-AND",
                description="Add 4 inputs to get output: 1",
                workspace_type="logic",
                difficulty=8,
                requirements={"gates": ["XOR", "AND"]}
            ),
            Challenge(
                id=21,
                title="Half Adder",
                description="Build a half adder circuit (Sum and Carry outputs)",
                workspace_type="logic",
                difficulty=9,
                requirements={"gates": ["XOR", "AND"]}
            ),
            Challenge(
                id=22,
                title="Full Adder",
                description="Build a full adder with 3 inputs",
                workspace_type="logic",
                difficulty=10,
                requirements={"gates": ["XOR", "AND", "OR"]}
            ),
            Challenge(
                id=23,
                title="4-Input Multiplexer",
                description="Create a 2-to-1 multiplexer with select line",
                workspace_type="logic",
                difficulty=9,
                requirements={"gates": ["AND", "OR", "NOT"]}
            ),
            Challenge(
                id=24,
                title="Priority Encoder",
                description="Design a 4-to-2 priority encoder",
                workspace_type="logic",
                difficulty=10,
                requirements={"gates": ["AND", "OR", "NOT"]}
            ),
            Challenge(
                id=25,
                title="Master Logic",
                description="Ultimate logic challenge: Complex multi-gate design",
                workspace_type="logic",
                difficulty=10,
                requirements={"gates": ["AND", "OR", "NOT", "XOR", "NAND"]}
            ),
        ]

        for challenge in challenges:
            session.add(challenge)
        session.commit()

def get_session():
    with Session(engine) as session:
        yield session