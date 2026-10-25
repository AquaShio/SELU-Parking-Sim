import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fetchMap, fetchPlayer, fetchPermitsConfig, fetchDifficultyConfig, startRun, finishRun, logEvent } from './services/api';
import { VehiclePhysics } from './game/physics';
import { GameRenderer } from './game/renderer';
import { TelemetryCollector } from './game/telemetryCollector';
import { sounds } from './game/sound';
import { HUD } from './components/HUD';
import { MissionSelect } from './components/MissionSelect';
import { DebriefModal } from './components/DebriefModal';

export default function App() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const vehicleRef = useRef(new VehiclePhysics(9248.7, 9788.8, 50));
  const telemetryRef = useRef(new TelemetryCollector(null));

  // Game UI & State
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'debrief'
  const [mapData, setMapData] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [permitsConfig, setPermitsConfig] = useState(null);
  const [difficultyConfig, setDifficultyConfig] = useState(null);

  // Active Run Configuration
  const [activeRunId, setActiveRunId] = useState(null);
  const [activePermit, setActivePermit] = useState('freshman');
  const [activeDestination, setActiveDestination] = useState(null);
  const [activeDifficulty, setActiveDifficulty] = useState(1);

  // Live Simulation Reactive Stats
  const [speedMph, setSpeedMph] = useState(0);
  const [gear, setGear] = useState('D');
  const [speedLimit, setSpeedLimit] = useState(20);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [strikes, setStrikes] = useState(0);
  const [distanceToDest, setDistanceToDest] = useState(0);
  const [destAngleDeg, setDestAngleDeg] = useState(0);
  const [parkingProgress, setParkingProgress] = useState(0);
  const [alertToast, setAlertToast] = useState(null);
  const [cameraZoom, setCameraZoom] = useState(1.65);
  const [isCruiseActive, setIsCruiseActive] = useState(false);
  const [cruiseSpeedMph, setCruiseSpeedMph] = useState(0);
  const [isPrecisionMode, setIsPrecisionMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [finishedRunData, setFinishedRunData] = useState(null);

  // Touch control inputs
  const [showTouch, setShowTouch] = useState(false);
  const touchInputs = useRef({ throttle: 0, brake: 0, steer: 0 });
  const toastTimeoutRef = useRef(null);
  const timeRemainingRef = useRef(120);
  const strikesRef = useRef(0);
  const activeRunIdRef = useRef(null);
  const activeDestinationRef = useRef(null);

  const showToast = useCallback((message, severity = 'warning', durationMs = 2400) => {
    setAlertToast({ message, severity });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setAlertToast(null);
    }, durationMs);
  }, []);

  // Load initial backend data
  useEffect(() => {
    async function initData() {
      try {
        const [p, m, perm, diff] = await Promise.all([
          fetchPlayer(),
          fetchMap('selu_campus'),
          fetchPermitsConfig(),
          fetchDifficultyConfig()
        ]);
        setPlayerStats(p);
        setMapData(m);
        setPermitsConfig(perm);
        setDifficultyConfig(diff);
      } catch (e) {
        console.warn('Initialization notice:', e);
      }
    }
    initData();
  }, []);

  const handleResetVehicle = useCallback(() => {
    const sp = activeDestination?.spawn || mapData?.spawn || { x: 9248.7, y: 9788.8, heading: 50 };
    vehicleRef.current.reset(sp.x, sp.y, sp.heading);
    setIsCruiseActive(false);
    if (rendererRef.current) {
      rendererRef.current.camera.x = sp.x;
      rendererRef.current.camera.y = sp.y;
    }
    showToast('Vehicle reset to campus road spawn', 'warning', 1600);
  }, [activeDestination, mapData, showToast]);

  const handleToggleCruise = useCallback(() => {
    const v = vehicleRef.current;
    if (!v) return;
    const active = v.toggleCruise();
    setIsCruiseActive(active);
    if (active) {
      const curMph = Math.round(v.getSpeedMph());
      setCruiseSpeedMph(curMph);
      showToast(`Cruise Control Engaged: ${curMph} MPH`, 'warning', 1600);
    } else {
      showToast('Cruise Control Disengaged', 'warning', 1200);
    }
  }, [showToast]);

  const handleCycleZoom = useCallback(() => {
    const levels = [1.3, 1.65, 2.1];
    setCameraZoom(prev => {
      const idx = levels.findIndex(z => Math.abs(z - prev) < 0.1);
      const next = levels[(idx + 1) % levels.length];
      if (rendererRef.current) {
        rendererRef.current.camera.zoom = next;
      }
      return next;
    });
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const keys = {};

    function handleKeyDown(e) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const key = e.key.toLowerCase();
      keys[key] = true;
      if (e.key === 'Shift') {
        setIsPrecisionMode(true);
      }
      updateVehicleInputs();

      if (key === 'h') {
        sounds.playHorn();
      } else if (key === 'c' && gameState === 'playing') {
        handleToggleCruise();
      } else if (key === 'r' && gameState === 'playing') {
        handleResetVehicle();
      }
    }

    function handleKeyUp(e) {
      const key = e.key.toLowerCase();
      keys[key] = false;
      if (e.key === 'Shift') {
        setIsPrecisionMode(false);
      }
      updateVehicleInputs();
    }

    function updateVehicleInputs() {
      const v = vehicleRef.current;
      if (!v) return;

      const isUp = keys['arrowup'] || keys['w'];
      const isDown = keys['arrowdown'] || keys['s'];
      const isLeft = keys['arrowleft'] || keys['a'];
      const isRight = keys['arrowright'] || keys['d'];
      const isHandbrake = keys[' '];
      const isShift = keys['shift'] || Boolean(keys['shiftleft'] || keys['shiftright']);

      v.inputs.throttle = isUp ? 1 : touchInputs.current.throttle;
      v.inputs.brake = isDown ? 1 : touchInputs.current.brake;
      v.inputs.steer = (isLeft ? -1 : (isRight ? 1 : 0)) || touchInputs.current.steer;
      v.inputs.handbrake = isHandbrake;
      v.inputs.precisionMode = isShift;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleResetVehicle, handleToggleCruise]);

  // Window resize handler for canvas
  useEffect(() => {
    function handleResize() {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start Run callback
  const handleStartMission = async ({ permitType, destination, difficulty }) => {
    sounds.init();
    setActivePermit(permitType);
    setActiveDestination(destination);
    setActiveDifficulty(difficulty);
    setAlertToast(null);
    setIsCruiseActive(false);

    const timeLimit = destination?.time_limit_s || 120;
    timeRemainingRef.current = timeLimit;
    strikesRef.current = 0;
    activeDestinationRef.current = destination;
    setTimeRemaining(timeLimit);
    setStrikes(0);
    setParkingProgress(0);

    const sp = destination?.spawn || mapData?.spawn || { x: 9248.7, y: 9788.8, heading: 50 };
    vehicleRef.current.reset(sp.x, sp.y, sp.heading);

    if (!rendererRef.current && canvasRef.current) {
      rendererRef.current = new GameRenderer(canvasRef.current);
    }
    if (rendererRef.current && mapData) {
      rendererRef.current.camera.zoom = cameraZoom;
      rendererRef.current.initEntities(mapData, difficulty, sp);
    }

    const run = await startRun({
      mapId: 'selu_campus',
      permitType,
      difficulty,
      destinationBuilding: destination?.building_id
    });

    activeRunIdRef.current = run.id;
    setActiveRunId(run.id);
    telemetryRef.current.setRunId(run.id);

    setGameState('playing');
  };

  // End Run callback
  const handleEndRun = useCallback(async (result, stallResult = null) => {
    sounds.stopEngine();
    const timeUsed = (activeDestinationRef.current?.time_limit_s || 120) - timeRemainingRef.current;

    await telemetryRef.current.flush();

    if (result === 'parked') {
      sounds.playVictoryFanfare();
    } else {
      sounds.playStrikeBuzzer();
    }

    const finishPayload = {
      result,
      timeToPark: Math.max(1, Math.round(timeUsed)),
      strikes: strikesRef.current,
      alignmentOffset: stallResult?.alignmentOffset || 0.0
    };

    const currentRunId = activeRunIdRef.current;
    if (currentRunId) {
      const finished = await finishRun(currentRunId, finishPayload);
      setFinishedRunData(finished);
    }

    const updatedPlayer = await fetchPlayer();
    setPlayerStats(updatedPlayer);

    setGameState('debrief');
  }, []);

  // Main 60FPS Game Loop
  useEffect(() => {
    if (gameState !== 'playing') {
      sounds.stopEngine();
      return;
    }

    let animId;
    let lastTime = performance.now();
    let simTime = 0;
    let speedViolationTimer = 0;
    let holdParkTimer = 0;
    let lastUiSec = Math.ceil(timeRemainingRef.current);
    let collisionStrikeCooldown = 0;
    let bumpToastCooldown = 0;
    let eligibleStallFound = null;

    if (!rendererRef.current && canvasRef.current) {
      rendererRef.current = new GameRenderer(canvasRef.current);
      if (mapData) {
        const sp = activeDestination?.spawn || mapData?.spawn;
        rendererRef.current.initEntities(mapData, activeDifficulty, sp);
      }
    }

    const environment = {
      speedLimitMph: 20,
      getObstacleCarOBBs: (wx, wy, rad) => rendererRef.current.getObstacleCarOBBs(wx, wy, rad),
      checkTreeCollision: (wx, wy, rad) => rendererRef.current.checkTreeCollision(wx, wy, rad),
      checkFootprintCollision: (pts) => rendererRef.current.checkFootprintCollision(pts)
    };

    function issueStrike(eventType, details, message) {
      sounds.playStrikeBuzzer();
      showToast(message, 'error', 2800);
      strikesRef.current += 1;
      const nextS = strikesRef.current;
      setStrikes(nextS);
      logEvent(activeRunIdRef.current, simTime, eventType, details);
      if (nextS >= 3) {
        sounds.stopEngine();
        handleEndRun('strikeout');
      }
    }

    function loop(currentTime) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;
      simTime += dt;

      if (collisionStrikeCooldown > 0) collisionStrikeCooldown = Math.max(0, collisionStrikeCooldown - dt);
      if (bumpToastCooldown > 0) bumpToastCooldown = Math.max(0, bumpToastCooldown - dt);

      const v = vehicleRef.current;
      const renderer = rendererRef.current;
      const map = mapData;

      if (v && renderer && map) {
        // 1. Physics & Solid Collision Update
        const collisionEvent = v.update(dt, environment);
        renderer.updateEntities(dt, v);

        if (collisionEvent) {
          if (collisionEvent.type === 'tree') {
            renderer.triggerTreeImpactEffect(collisionEvent.x, collisionEvent.y);
            sounds.playTreeRustle();
            if (collisionStrikeCooldown <= 0) {
              collisionStrikeCooldown = 1.6;
              issueStrike(
                'tree_collision_strike',
                { impact_mph: Math.round(collisionEvent.impactMph) },
                'Tree Collision! Avoid campus landscaping — Strike Issued'
              );
            }
          } else if (collisionEvent.type === 'vehicle_collision') {
            renderer.triggerImpactEffect(collisionEvent.x, collisionEvent.y, collisionEvent.obstacleId);
            sounds.playCurbThud();
            if (collisionStrikeCooldown <= 0) {
              collisionStrikeCooldown = 1.6;
              issueStrike(
                'vehicle_collision_strike',
                { impact_mph: Math.round(collisionEvent.impactMph), obstacle: collisionEvent.obstacleId },
                'Vehicle Collision! Do not hit parked cars — Strike Issued'
              );
            }
          } else if (collisionEvent.type === 'building') {
            renderer.triggerImpactEffect(collisionEvent.x, collisionEvent.y);
            sounds.playCurbThud();
            if (collisionStrikeCooldown <= 0) {
              collisionStrikeCooldown = 1.6;
              issueStrike(
                'building_collision_strike',
                { impact_mph: Math.round(collisionEvent.impactMph) },
                'Building Collision! Stay on campus roadways — Strike Issued'
              );
            }
          } else if (collisionEvent.type === 'curb_or_grass') {
            renderer.triggerImpactEffect(collisionEvent.x, collisionEvent.y);
            sounds.playCurbThud();
            if (collisionEvent.impactMph >= 10.5 && collisionStrikeCooldown <= 0) {
              collisionStrikeCooldown = 1.6;
              issueStrike(
                'offroad_curb_strike',
                { impact_mph: Math.round(collisionEvent.impactMph) },
                'Hard Curb / Grass Impact! Keep on paved asphalt — Strike Issued'
              );
            } else if (bumpToastCooldown <= 0) {
              bumpToastCooldown = 1.2;
              showToast('Curb / Grass Boundary — Stay on paved asphalt', 'warning', 1800);
            }
          }
        }

        // 2. Audio update
        sounds.updateEngine(v.getSpeedMph(), v.inputs.throttle, v.isBraking);

        // 3. Telemetry 10Hz sampling
        telemetryRef.current.update(dt, simTime, v);

        // 4. Countdown Timer update (throttled to 1/sec for UI stability)
        timeRemainingRef.current = Math.max(0, timeRemainingRef.current - dt);
        const curSec = Math.ceil(timeRemainingRef.current);
        if (curSec !== lastUiSec) {
          lastUiSec = curSec;
          setTimeRemaining(curSec);
        }
        if (timeRemainingRef.current <= 0) {
          handleEndRun('timeout');
          return;
        }

        // 5. Speed Zone check & Governor sync
        let currentZoneLimit = 20;
        if (map.speed_zones) {
          for (const sz of map.speed_zones) {
            const [zx, zy, zw, zh] = sz.rect;
            if (v.x >= zx && v.x <= zx + zw && v.y >= zy && v.y <= zy + zh) {
              currentZoneLimit = sz.limit_mph;
              break;
            }
          }
        }
        setSpeedLimit(currentZoneLimit);
        environment.speedLimitMph = currentZoneLimit;

        // Speeding penalties disabled for testing as requested by user
        speedViolationTimer = 0;

        // 5b. Pedestrian Collision & Yield Check
        const hitPed = renderer.checkPedestrianCollision(v);
        if (hitPed && v.getSpeedMph() > 1.8 && collisionStrikeCooldown <= 0) {
          collisionStrikeCooldown = 2.0;
          renderer.triggerImpactEffect(hitPed.x, hitPed.y);
          sounds.playStrikeBuzzer();
          hitPed.x += Math.cos(v.angle) * 22;
          hitPed.y += Math.sin(v.angle) * 22;
          issueStrike(
            'pedestrian_yield_strike',
            { speed: Math.round(v.getSpeedMph()) },
            'Pedestrian Incident! Yield to students at campus crosswalks — Strike Issued'
          );
        }

        // 6. Parking Stall Detection & Hold Meter
        eligibleStallFound = null;
        let isDocking = false;

        if (map.lots) {
          for (const lot of map.lots) {
            if (!lot.stalls) continue;
            for (const stall of lot.stalls) {
              if (renderer.occupiedStallIds.has(stall.id)) continue;

              if (Math.hypot(v.x - stall.x, v.y - stall.y) < 45) {
                const check = v.checkStallParking(stall);
                if (check.isEligible) {
                  const isPermitLegal = renderer.checkPermitAllowance(activePermit, stall.stall_type);
                  if (isPermitLegal) {
                    eligibleStallFound = stall;
                    isDocking = true;
                    // Stationary parking: advances quickly and reliably when car is stopped still
                    const rate = check.isStationary ? 1.6 : 1.1;
                    holdParkTimer += dt * rate;
                    const progress = Math.min(1.0, holdParkTimer / 0.95);
                    setParkingProgress(progress);

                    if (progress >= 1.0) {
                      handleEndRun('parked', check);
                      return;
                    }
                  } else {
                    holdParkTimer += dt;
                    if (holdParkTimer > 1.2) {
                      holdParkTimer = 0;
                      issueStrike(
                        'permit_denied_strike',
                        { stall: stall.id, type: stall.stall_type },
                        `Unauthorized Stall (${stall.stall_type.toUpperCase()} Permit Required) — Strike Issued`
                      );
                    }
                  }
                  break;
                }
              }
            }
            if (isDocking) break;
          }
        }

        if (!isDocking) {
          // Smooth decay instead of snapping to 0 on single frame jitter
          holdParkTimer = Math.max(0, holdParkTimer - dt * 2.0);
          setParkingProgress(Math.min(1.0, holdParkTimer / 0.95));
        }

        // 7. Destination Compass Math (1 px at Zoom 19 ~= 0.422 ft)
        if (activeDestination && map.buildings) {
          const destBldg = map.buildings.find(b => b.id === activeDestination.building_id);
          if (destBldg) {
            const bx = destBldg.rect[0] + destBldg.rect[2] / 2;
            const by = destBldg.rect[1] + destBldg.rect[3] / 2;
            const distPx = Math.hypot(bx - v.x, by - v.y);
            const targetAngle = Math.atan2(by - v.y, bx - v.x);
            const relAngle = ((targetAngle - v.angle) * 180 / Math.PI + 360) % 360;

            setDistanceToDest(distPx * 0.422);
            setDestAngleDeg(relAngle);
          }
        }

        // 8. Sync reactive HUD states
        setSpeedMph(v.getSpeedMph());
        setGear(v.gear);
        setIsCruiseActive(v.cruiseActive);
        if (v.cruiseActive) {
          setCruiseSpeedMph(Math.round(v.cruiseTargetSpeed / 7.5));
        }

        // 9. Canvas Render
        renderer.render(
          map,
          v,
          activePermit,
          activeDestination,
          Math.min(1.0, holdParkTimer / 0.95),
          eligibleStallFound
        );
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      sounds.stopEngine();
    };
  }, [gameState, mapData, activeDifficulty, activePermit, activeDestination, activeRunId, handleEndRun, showToast]);

  const touchHandlers = {
    setThrottle: (val) => { touchInputs.current.throttle = val; vehicleRef.current.inputs.throttle = val; },
    setBrake: (val) => { touchInputs.current.brake = val; vehicleRef.current.inputs.brake = val; },
    setSteer: (val) => { touchInputs.current.steer = val; vehicleRef.current.inputs.steer = val; }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full cursor-crosshair"
      />

      {gameState === 'playing' && (
        <HUD
          speedMph={speedMph}
          speedLimit={speedLimit}
          gear={gear}
          timeRemaining={timeRemaining}
          strikes={strikes}
          maxStrikes={3}
          destination={activeDestination}
          distanceToDest={distanceToDest}
          destAngleDeg={destAngleDeg}
          permitInfo={permitsConfig?.permits?.[activePermit]}
          parkingProgress={parkingProgress}
          alertToast={alertToast}
          cameraZoom={cameraZoom}
          onCycleZoom={handleCycleZoom}
          onResetVehicle={handleResetVehicle}
          isCruiseActive={isCruiseActive}
          cruiseSpeedMph={cruiseSpeedMph}
          onToggleCruise={handleToggleCruise}
          isPrecisionMode={isPrecisionMode}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(sounds.toggleMute())}
          showTouchControls={showTouch}
          onToggleTouch={() => setShowTouch(!showTouch)}
          touchHandlers={touchHandlers}
        />
      )}

      {gameState === 'menu' && (
        <MissionSelect
          mapData={mapData}
          permitsConfig={permitsConfig}
          difficultyConfig={difficultyConfig}
          playerStats={playerStats}
          onStartMission={handleStartMission}
        />
      )}

      {gameState === 'debrief' && (
        <DebriefModal
          runData={finishedRunData}
          onPlayAgain={() => handleStartMission({
            permitType: activePermit,
            destination: activeDestination,
            difficulty: activeDifficulty
          })}
          onBackToMenu={() => setGameState('menu')}
        />
      )}
    </div>
  );
}
