# RUPS - 2: Updating a Circuit Builder/Simulator project
*original project: https://github.com/E-nej/RUPS-projekt*

## Why update project?
The goal of this assignment was to update the existing project so that it adheres to a new domain: highschool.

The project was originaly created for intended use of elementary school students. Our goal is to upgrade the existing components to be used by high school students.

## Found Issues
- The entire project looks foggy and pixelated
- Input for rotating pieces should be updated, not to rotate while dragging
- Inconsistent sizes and lines of pieces (redraw)
- Update style for consistency
- The current implementation doesnt support series or parallel circuit logic, no voltage division and no current computation

## New Project Components
### Backend
A backend will be added to the project for user authentication, and saving created constructs. (Python)
### Database
We will also add a database to be used in the backend. (SQLite)
### New Additions
- Fix issues (described above)
- Option to save circuits
- Challenges (described later)
- Add logic gates
- Input for logic circuits (table), and get the coresponding output (also table)
- Add zoom and camera movement within the circuit editor
### Challenges
When the user loggs in, he can either enter a sandbox mode, or challenge mode.

The challenges are of 2 types:

#### 1. May there be light
The user has to make all lights light up, by connecting the circuit correctly, using the limited resources at his disposal.
#### 2. Logic Challenge
Get the right input/output for the logic gates, by connecting the circuit with the gates provided.