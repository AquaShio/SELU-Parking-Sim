import { sendTelemetryBatch } from '../services/api';

export class TelemetryCollector {
  constructor(runId) {
    this.runId = runId;
    this.buffer = [];
    this.sampleInterval = 0.1; // 10Hz (100ms)
    this.accumulatedTime = 0;
    this.flushInterval = 1.5; // flush batch every 1.5 seconds
    this.timeSinceFlush = 0;
  }

  setRunId(runId) {
    this.runId = runId;
    this.buffer = [];
    this.accumulatedTime = 0;
    this.timeSinceFlush = 0;
  }

  update(dt, simTime, vehicle) {
    if (!this.runId) return;

    this.accumulatedTime += dt;
    this.timeSinceFlush += dt;

    if (this.accumulatedTime >= this.sampleInterval) {
      this.accumulatedTime = 0;

      this.buffer.push({
        t: Number(simTime.toFixed(2)),
        speed_mph: Number(vehicle.getSpeedMph().toFixed(1)),
        steering_angle: Number((vehicle.steerAngle * 180 / Math.PI).toFixed(2)),
        throttle: Number(vehicle.inputs.throttle.toFixed(2)),
        brake: Number(vehicle.inputs.brake.toFixed(2)),
        x: Number(vehicle.x.toFixed(1)),
        y: Number(vehicle.y.toFixed(1)),
        heading: Number(vehicle.getHeadingDeg().toFixed(1)),
        lane_offset: 0.0
      });
    }

    if (this.timeSinceFlush >= this.flushInterval && this.buffer.length > 0) {
      this.flush();
    }
  }

  async flush() {
    if (!this.runId || this.buffer.length === 0) return;
    const batchToSend = [...this.buffer];
    this.buffer = [];
    this.timeSinceFlush = 0;
    await sendTelemetryBatch(this.runId, batchToSend);
  }
}
