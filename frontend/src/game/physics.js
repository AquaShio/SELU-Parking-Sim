// 2D Oriented Bounding Box (OBB) Separating Axis Theorem (SAT) helper
export function testOBBOverlap(obbA, obbB) {
  const axes = [
    { x: obbA.cos, y: obbA.sin },
    { x: -obbA.sin, y: obbA.cos },
    { x: obbB.cos, y: obbB.sin },
    { x: -obbB.sin, y: obbB.cos }
  ];

  let minOverlap = Infinity;
  let smallestAxis = null;

  for (const axis of axes) {
    let minA = Infinity, maxA = -Infinity;
    for (const c of obbA.corners) {
      const proj = c.x * axis.x + c.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    let minB = Infinity, maxB = -Infinity;
    for (const c of obbB.corners) {
      const proj = c.x * axis.x + c.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) {
      return null; // Separating axis found -> no collision
    }
    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxis = axis;
    }
  }

  // Ensure MTV points from B toward A (pushes A out of B)
  const dx = obbA.x - obbB.x;
  const dy = obbA.y - obbB.y;
  let nx = smallestAxis.x;
  let ny = smallestAxis.y;
  if (dx * nx + dy * ny < 0) {
    nx = -nx;
    ny = -ny;
  }

  return { overlap: minOverlap, nx, ny };
}

export function buildOBB(x, y, angleRad, length, width, id = null) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const halfL = length / 2;
  const halfW = width / 2;

  return {
    id,
    x,
    y,
    cos,
    sin,
    halfL,
    halfW,
    corners: [
      { x: x + cos * halfL - sin * halfW, y: y + sin * halfL + cos * halfW },
      { x: x + cos * halfL + sin * halfW, y: y + sin * halfL - cos * halfW },
      { x: x - cos * halfL + sin * halfW, y: y - sin * halfL - cos * halfW },
      { x: x - cos * halfL - sin * halfW, y: y - sin * halfL + cos * halfW }
    ]
  };
}

export class VehiclePhysics {
  constructor(spawnX = 9248.7, spawnY = 9788.8, headingDeg = 50) {
    this.x = spawnX;
    this.y = spawnY;
    this.angle = (headingDeg * Math.PI) / 180;
    this.speed = 0; // pixels/s at Zoom 19 (1 mph = 7.5 px/s)
    this.steerAngle = 0;

    // Physical dimensions matched to Concept3D Zoom 19 painted stalls (~20x38 px)
    this.width = 14.5;
    this.length = 30.0;
    this.wheelBase = 20.5;

    // Responsive, intuitive speed control tuning
    this.maxSpeedForward = 225;  // 30 mph top speed
    this.maxSpeedReverse = -58;  // ~7.7 mph reverse (gentle, easy to park)
    this.accelRate = 135;        // Smooth progressive acceleration
    this.brakeRate = 320;        // Responsive braking
    this.handbrakeRate = 480;
    this.rollingFriction = 24.0; // Gentle natural coasting (easy to maintain speed!)
    this.maxSteerAngle = 0.58;   // ~33 degrees
    this.steerSpeed = 3.2;
    this.steerReturnSpeed = 4.2;

    // Cruise Control / Speed Hold
    this.cruiseActive = false;
    this.cruiseTargetSpeed = 0; // px/s

    this.inputs = {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: false,
      precisionMode: false // Shift key for slow precision parking
    };

    this.gear = 'D';
    this.isBraking = false;
    this.isDrifting = false;
    this.reverseHoldTimer = 0;
  }

  reset(x, y, headingDeg = 50) {
    this.x = x;
    this.y = y;
    this.angle = (headingDeg * Math.PI) / 180;
    this.speed = 0;
    this.steerAngle = 0;
    this.gear = 'D';
    this.isBraking = false;
    this.isDrifting = false;
    this.cruiseActive = false;
    this.cruiseTargetSpeed = 0;
    this.reverseHoldTimer = 0;
  }

  toggleCruise() {
    if (this.speed > 25) { // At least ~3.5 mph to engage
      this.cruiseActive = !this.cruiseActive;
      this.cruiseTargetSpeed = this.cruiseActive ? this.speed : 0;
      return this.cruiseActive;
    }
    this.cruiseActive = false;
    return false;
  }

  update(dt, environment = null) {
    if (dt <= 0 || dt > 0.1) dt = 0.016;

    // 1. Steering
    if (this.inputs.steer !== 0) {
      this.steerAngle += this.inputs.steer * this.steerSpeed * dt;
      this.steerAngle = Math.max(-this.maxSteerAngle, Math.min(this.maxSteerAngle, this.steerAngle));
    } else {
      if (Math.abs(this.steerAngle) > 0.01) {
        const sign = Math.sign(this.steerAngle);
        this.steerAngle -= sign * this.steerReturnSpeed * dt;
        if (Math.sign(this.steerAngle) !== sign) this.steerAngle = 0;
      } else {
        this.steerAngle = 0;
      }
    }

    // 2. Throttle & Braking with intuitive speed control
    this.isBraking = false;
    const { throttle, brake, handbrake, precisionMode } = this.inputs;

    // Cancel cruise control on active braking
    if (brake > 0 || handbrake) {
      this.cruiseActive = false;
    }

    // Speed limits based on mode & testing governor (speeding physically impossible)
    const roadSpeedLimitMph = environment?.speedLimitMph || 20;
    const speedLimitGovernor = roadSpeedLimitMph * 7.5; // in px/s (1 mph = 7.5 px/s)
    const effectiveMaxSpeed = Math.min(precisionMode ? 58 : this.maxSpeedForward, speedLimitGovernor);
    const currentAccelRate = precisionMode ? 65 : (this.speed < 110 ? 115 : this.accelRate);

    // Keep vehicle speed strictly governed to road speed limit
    if (this.speed > effectiveMaxSpeed) {
      this.speed = Math.max(effectiveMaxSpeed, this.speed - this.brakeRate * 0.5 * dt);
    }
    if (this.cruiseActive && this.cruiseTargetSpeed > effectiveMaxSpeed) {
      this.cruiseTargetSpeed = effectiveMaxSpeed;
    }

    if (handbrake) {
      // Handbrake brings vehicle firmly to a dead stop and holds it motionless
      this.isBraking = true;
      if (Math.abs(this.speed) > 2.0) {
        const sign = Math.sign(this.speed);
        this.speed -= sign * this.handbrakeRate * dt;
        if (Math.sign(this.speed) !== sign) this.speed = 0;
      } else {
        this.speed = 0;
      }
      this.reverseHoldTimer = 0;
    } else if (throttle > 0) {
      this.reverseHoldTimer = 0;
      if (this.speed < -4.0) {
        // Braking while in reverse
        this.speed += this.brakeRate * dt;
        this.isBraking = true;
        if (this.speed > 0) this.speed = 0;
      } else {
        // Driving forward
        this.speed += throttle * currentAccelRate * dt;
        if (this.speed > effectiveMaxSpeed) this.speed = effectiveMaxSpeed;
        this.gear = 'D';
        if (this.cruiseActive && this.speed > this.cruiseTargetSpeed) {
          this.cruiseTargetSpeed = this.speed;
        }
      }
    } else if (brake > 0) {
      if (this.speed > 4.0) {
        // Active forward braking
        this.speed -= this.brakeRate * dt;
        this.isBraking = true;
        this.reverseHoldTimer = 0;
        if (this.speed < 0) this.speed = 0;
      } else if (this.speed < -2.0) {
        // Reversing backwards
        this.speed -= brake * 85 * dt;
        if (this.speed < this.maxSpeedReverse) this.speed = this.maxSpeedReverse;
        this.gear = 'R';
      } else {
        // Stationary or near zero speed with brake held: HOLD FIRMLY AT ZERO
        this.speed = 0;
        this.isBraking = true;
        this.reverseHoldTimer += dt;
        // Holding brake while stationary for > 0.32s transitions into reverse
        if (this.reverseHoldTimer > 0.32) {
          this.gear = 'R';
          this.speed = -12;
        }
      }
    } else if (this.cruiseActive && this.gear === 'D') {
      this.reverseHoldTimer = 0;
      const speedDiff = this.cruiseTargetSpeed - this.speed;
      if (Math.abs(speedDiff) > 1.0) {
        this.speed += Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), 90 * dt);
      }
    } else {
      // Natural friction coasting: snaps firmly to 0 below 2.0 px/s
      this.reverseHoldTimer = 0;
      if (Math.abs(this.speed) > 2.0) {
        const sign = Math.sign(this.speed);
        this.speed -= sign * this.rollingFriction * dt;
        if (Math.sign(this.speed) !== sign) this.speed = 0;
      } else {
        this.speed = 0;
      }
    }

    this.isDrifting = Boolean(handbrake && Math.abs(this.speed) > 75);

    // 3. Sub-stepped kinematic & collision integration
    const steps = 3;
    const subDt = dt / steps;
    let collisionEvent = null;

    for (let s = 0; s < steps; s++) {
      const prevX = this.x;
      const prevY = this.y;
      const prevAngle = this.angle;
      const impactMph = this.getSpeedMph();

      if (Math.abs(this.speed) > 0.08) {
        const angularVelocity = (this.speed / this.wheelBase) * Math.tan(this.steerAngle);
        this.angle = (this.angle + angularVelocity * subDt + Math.PI * 2) % (Math.PI * 2);
      }

      const moveDx = Math.cos(this.angle) * this.speed * subDt;
      const moveDy = Math.sin(this.angle) * this.speed * subDt;
      this.x += moveDx;
      this.y += moveDy;

      if (!environment) continue;

      // A. Solid Car-to-Car OBB Collision
      if (environment.getObstacleCarOBBs) {
        const myOBB = this.getOBB();
        const obstacles = environment.getObstacleCarOBBs(this.x, this.y, 65);
        let hitCar = null;
        for (const obs of obstacles) {
          const mtv = testOBBOverlap(myOBB, obs);
          if (mtv) {
            this.x += mtv.nx * (mtv.overlap + 0.6);
            this.y += mtv.ny * (mtv.overlap + 0.6);
            hitCar = obs;
            break;
          }
        }
        if (hitCar) {
          this.speed = -this.speed * 0.28;
          this.cruiseActive = false;
          if (!collisionEvent) {
            collisionEvent = {
              type: 'vehicle_collision',
              impactMph,
              obstacleId: hitCar.id,
              x: this.x,
              y: this.y
            };
          }
          break;
        }
      }

      // Trees are on grass landscaping: all off-road collisions are handled as grass/curb collisions below

      // B. Solid Building & Off-Road Curb / Grass Island Collision
      if (environment.checkFootprintCollision) {
        const check = environment.checkFootprintCollision(this.getPerimeterPoints());
        if (check.collided) {
          this.x = prevX;
          this.y = prevY;
          this.angle = prevAngle;

          // Try sliding
          this.x = prevX + moveDx * 0.5;
          if (environment.checkFootprintCollision(this.getPerimeterPoints()).collided) {
            this.x = prevX;
            this.y = prevY + moveDy * 0.5;
            if (environment.checkFootprintCollision(this.getPerimeterPoints()).collided) {
              this.y = prevY;
              this.speed = -this.speed * 0.22;
              this.cruiseActive = false;
            } else {
              this.speed *= 0.78;
            }
          } else {
            this.speed *= 0.78;
          }

          if (!collisionEvent && impactMph >= 3.5) {
            collisionEvent = {
              type: check.reason || 'curb_or_grass',
              impactMph,
              x: check.point ? check.point.x : this.x,
              y: check.point ? check.point.y : this.y
            };
          }
          break;
        }
      }
    }

    return collisionEvent;
  }

  getSpeedMph() {
    return Math.abs(this.speed) / 7.5;
  }

  getHeadingDeg() {
    return (this.angle * 180) / Math.PI;
  }

  getOBB() {
    return buildOBB(this.x, this.y, this.angle, this.length, this.width, 'player');
  }

  getCorners() {
    return this.getOBB().corners;
  }

  getPerimeterPoints() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const halfL = this.length / 2 - 1.2;
    const halfW = this.width / 2 - 1.2;

    return [
      { x: this.x + cos * halfL - sin * halfW, y: this.y + sin * halfL + cos * halfW },
      { x: this.x + cos * halfL + sin * halfW, y: this.y + sin * halfL - cos * halfW },
      { x: this.x - cos * halfL + sin * halfW, y: this.y - sin * halfL - cos * halfW },
      { x: this.x - cos * halfL - sin * halfW, y: this.y - sin * halfL + cos * halfW },
      { x: this.x + cos * halfL, y: this.y + sin * halfL },
      { x: this.x - cos * halfL, y: this.y - sin * halfL },
      { x: this.x - sin * halfW, y: this.y + cos * halfW },
      { x: this.x + sin * halfW, y: this.y - cos * halfW }
    ];
  }

  // Check if car is cleanly parked inside a stall
  checkStallParking(stall) {
    const stallCx = stall.x;
    const stallCy = stall.y;
    const dist = Math.hypot(this.x - stallCx, this.y - stallCy);
    if (dist > 45) {
      return { isInside: false, speedLow: false, isAligned: false, isStationary: false, alignmentOffset: 1.0, isEligible: false };
    }

    // stall.angle is the longitudinal axis of the stall (parallel to divider lines)
    const stallRad = ((stall.angle || 0) * Math.PI) / 180;
    const cosS = Math.cos(stallRad);
    const sinS = Math.sin(stallRad);

    const halfL = stall.height / 2;
    const halfW = stall.width / 2;

    const maxU = halfL + 8.5; // along divider lines
    const maxV = halfW + 6.5; // across divider lines

    const corners = this.getCorners();
    let insideCount = 0;
    for (const c of corners) {
      const dx = c.x - stallCx;
      const dy = c.y - stallCy;
      const u = dx * cosS + dy * sinS;
      const v = -dx * sinS + dy * cosS;
      if (Math.abs(u) <= maxU && Math.abs(v) <= maxV) {
        insideCount++;
      }
    }

    // Car center in stall local coordinate space
    const centerDx = this.x - stallCx;
    const centerDy = this.y - stallCy;
    const centerU = centerDx * cosS + centerDy * sinS;
    const centerV = -centerDx * sinS + centerDy * cosS;

    // Inside when at least 2 corners and car center are within stall footprint
    const isInside = insideCount >= 2 && Math.abs(centerU) <= halfL + 6.5 && Math.abs(centerV) <= halfW + 5.5;

    const curSpeedMph = this.getSpeedMph();
    const speedLow = curSpeedMph < 3.8;
    const isStationary = curSpeedMph < 1.2;

    // Angle alignment relative to stall dividers (0 or 180 deg)
    const deg = this.getHeadingDeg();
    const stallAngle = stall.angle || 0;
    let diff = Math.abs(((deg - stallAngle) % 180 + 180) % 180);
    if (diff > 90) diff = 180 - diff;
    const isAligned = diff < 45; // Allow up to 45 degrees angle for natural campus parking

    const alignmentOffset = Math.min(1.0, Math.hypot(centerU, centerV) / 22.0);

    return {
      isInside,
      speedLow,
      isAligned,
      isStationary,
      alignmentOffset,
      isEligible: isInside && speedLow && isAligned
    };
  }
}
