"""Neo4j connection and session management."""

from neo4j import GraphDatabase

from src.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def get_session():
    """Return a new Neo4j session."""
    return driver.session()


def close():
    """Close the Neo4j driver."""
    driver.close()
