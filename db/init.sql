-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Raw sensor data from C-MAPSS
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    cycle INTEGER NOT NULL,
    op_setting_1 FLOAT,
    op_setting_2 FLOAT,
    op_setting_3 FLOAT,
    sensor_1 FLOAT, sensor_2 FLOAT, sensor_3 FLOAT,
    sensor_4 FLOAT, sensor_5 FLOAT, sensor_6 FLOAT,
    sensor_7 FLOAT, sensor_8 FLOAT, sensor_9 FLOAT,
    sensor_10 FLOAT, sensor_11 FLOAT, sensor_12 FLOAT,
    sensor_13 FLOAT, sensor_14 FLOAT, sensor_15 FLOAT,
    sensor_16 FLOAT, sensor_17 FLOAT, sensor_18 FLOAT,
    sensor_19 FLOAT, sensor_20 FLOAT, sensor_21 FLOAT,
    dataset VARCHAR(10),
    UNIQUE(unit_id, cycle, dataset)
);

-- Maintenance actions (proposed and completed)
CREATE TABLE maintenance_log (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    action_type VARCHAR(20) NOT NULL
        CHECK (action_type IN ('inspect', 'service', 'replace')),
    urgency VARCHAR(20) NOT NULL
        CHECK (urgency IN ('routine', 'soon', 'immediate')),
    proposed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    evidence JSONB,
    cmms_work_order_id VARCHAR(50),
    notes TEXT
);

-- Anomaly event log for audit trail
CREATE TABLE anomaly_events (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    cycle INTEGER NOT NULL,
    anomaly_score FLOAT,
    health_index FLOAT,
    flagged_sensors JSONB,
    detected_at TIMESTAMP DEFAULT NOW()
);

-- Decision traces for playbook/memory system
CREATE TABLE decision_traces (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50),
    unit_id INTEGER,
    query TEXT,
    intent VARCHAR(50),
    tools_called JSONB,
    recommendation TEXT,
    action_taken VARCHAR(50),
    outcome VARCHAR(50),
    sensor_context JSONB,
    embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sensor_unit_cycle ON sensor_readings(unit_id, cycle);
CREATE INDEX idx_sensor_dataset ON sensor_readings(dataset);
CREATE INDEX idx_maintenance_unit ON maintenance_log(unit_id);
CREATE INDEX idx_maintenance_status ON maintenance_log(status);
CREATE INDEX idx_anomaly_unit ON anomaly_events(unit_id);
CREATE INDEX idx_traces_unit ON decision_traces(unit_id);
