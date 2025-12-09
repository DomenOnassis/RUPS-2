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
                title="Simple Circuit",
                description="Connect a battery and a bulb",
                workspace_type="electric",
                difficulty=1,
                requirements={"bulbs": 1, "batteries": 1}
            ),
            Challenge(
                title="Series Circuit",
                description="Connect 2 bulbs in series",
                workspace_type="electric",
                difficulty=2,
                requirements={"bulbs": 2, "batteries": 1}
            ),
            Challenge(
                title="Parallel Circuit",
                description="Connect 2 bulbs in parallel",
                workspace_type="electric",
                difficulty=3,
                requirements={"bulbs": 2, "batteries": 1}
            ),
            Challenge(
                title="Switch Control",
                description="Add a switch to control the bulb",
                workspace_type="electric",
                difficulty=4,
                requirements={"bulbs": 1, "batteries": 1, "switches": 1}
            ),
            Challenge(
                title="Resistor Network",
                description="Build a circuit with resistors",
                workspace_type="electric",
                difficulty=5,
                requirements={"bulbs": 1, "batteries": 1, "resistors": 1}
            ),
            Challenge(
                title="Complex Series",
                description="Multiple components in series",
                workspace_type="electric",
                difficulty=6,
                requirements={"bulbs": 2, "batteries": 1, "resistors": 1}
            ),
            Challenge(
                title="Mixed Circuit",
                description="Combine series and parallel",
                workspace_type="electric",
                difficulty=7,
                requirements={"bulbs": 3, "batteries": 1}
            ),
            Challenge(
                title="Voltage Division",
                description="Create voltage divider circuit",
                workspace_type="electric",
                difficulty=8,
                requirements={"bulbs": 1, "batteries": 1, "resistors": 2}
            ),
            Challenge(
                title="Bridge Circuit",
                description="Build a Wheatstone bridge",
                workspace_type="electric",
                difficulty=9,
                requirements={"bulbs": 1, "batteries": 1, "resistors": 4}
            ),
            Challenge(
                title="Advanced Design",
                description="Complex multi-component circuit",
                workspace_type="electric",
                difficulty=10,
                requirements={"bulbs": 3, "batteries": 2, "resistors": 2, "switches": 1}
            ),
            Challenge(
                title="AND Gate",
                description="Implement an AND logic gate",
                workspace_type="logic",
                difficulty=1,
                requirements={"gates": ["AND"]}
            ),
            Challenge(
                title="OR Gate",
                description="Implement an OR logic gate",
                workspace_type="logic",
                difficulty=2,
                requirements={"gates": ["OR"]}
            ),
            Challenge(
                title="NOT Gate",
                description="Implement a NOT logic gate",
                workspace_type="logic",
                difficulty=3,
                requirements={"gates": ["NOT"]}
            ),
            Challenge(
                title="XOR Gate",
                description="Implement an XOR logic gate",
                workspace_type="logic",
                difficulty=4,
                requirements={"gates": ["XOR"]}
            ),
            Challenge(
                title="Truth Table 1",
                description="Match the given truth table",
                workspace_type="logic",
                difficulty=5,
                requirements={"gates": ["AND", "OR"]}
            ),
            Challenge(
                title="Truth Table 2",
                description="Design circuit for complex truth table",
                workspace_type="logic",
                difficulty=6,
                requirements={"gates": ["AND", "OR", "NOT"]}
            ),
            Challenge(
                title="Multi-Gate",
                description="Combine multiple gate types",
                workspace_type="logic",
                difficulty=7,
                requirements={"gates": ["AND", "OR", "XOR"]}
            ),
            Challenge(
                title="Adder Circuit",
                description="Build a binary adder",
                workspace_type="logic",
                difficulty=8,
                requirements={"gates": ["AND", "OR", "XOR"]}
            ),
            Challenge(
                title="Multiplexer",
                description="Design a multiplexer circuit",
                workspace_type="logic",
                difficulty=9,
                requirements={"gates": ["AND", "OR", "NOT"]}
            ),
            Challenge(
                title="Advanced Logic",
                description="Complex logic design challenge",
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