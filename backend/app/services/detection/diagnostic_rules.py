from typing import Dict, List, Tuple
from app.models.entities import EventSeverity

ZONE_COMPONENT_NAMES = {
    "ZONE-01": "Hydraulic Oil Reservoir & Power Pack Unit",
    "ZONE-02": "Hydraulic Axial Piston Pump & Electric Drive Motor",
    "ZONE-03": "High-Pressure Delivery Pipeline & Manifold",
    "ZONE-04": "Directional Proportional Control Valve Block",
    "ZONE-05": "500-Ton Hydraulic Actuator Cylinder & Main Ram",
    "ZONE-06": "Low-Pressure Oil Return Pipeline & Filter Assembly",
}

def diagnose_telemetry(
    zone_id: str,
    raw_signal_pct: float,
    pressure_bar: float,
    temperature_c: float,
    flow_rate_lpm: float,
    is_sensor_connected: bool,
    is_wifi_connected: bool,
    duration_sec: float,
    threshold_sec: float,
    detection_threshold_pct: float = 65.0
) -> Dict:
    """
    Automated Rule-Based Defect Diagnosis:
    Classifies conditions based on multi-sensor evidence.
    Important: A pressure drop alone without oil signal is NOT classified as leakage!
    """
    component_name = ZONE_COMPONENT_NAMES.get(zone_id, f"Component {zone_id}")

    # 1. Edge Communication Failure
    if not is_wifi_connected:
        return {
            "defect_type": "Communication Failure",
            "severity": EventSeverity.HIGH.value,
            "diagnosis_summary": f"ESP32-EDGE-01 communication link dropped during active monitoring. Telemetry packets are buffering locally on edge non-volatile SRAM.",
            "detection_evidence": f"Wi-Fi ping timeout (>5000ms), packet loss 100%, edge node socket disconnected.",
            "possible_causes": [
                "2.4GHz Wi-Fi signal attenuation from heavy steel stamping enclosures",
                "Factory WLAN access point DHCP pool exhaustion or lease timeout",
                "Edge node 24V-to-5V buck converter transient voltage dip"
            ],
            "recommended_inspection": "Inspect factory WLAN AP status in Bay Alpha; test edge antenna SMA connector torque.",
            "recommended_action": "Power cycle edge unit ESP32-EDGE-01, verify static IP gateway binding, ensure buffer flushes upon reconnect."
        }

    # 2. Hardware Sensor Disconnection / Fault
    if not is_sensor_connected:
        return {
            "defect_type": "Sensor Disconnection",
            "severity": EventSeverity.MEDIUM.value,
            "diagnosis_summary": f"Optical oil leak sensor on {component_name} reported zero loop current (0 mA / offline). Not an active fluid leak.",
            "detection_evidence": f"Sensor connection state = False, raw signal = 0.0%, 4-20mA current loop open circuit.",
            "possible_causes": [
                "M12 4-pin quick-disconnect cable snagged or sheared during press stroke",
                "Screw terminal loosening on edge node DIN rail from 500-ton press shock vibration",
                "Photodiode emitter degradation in optical sensor probe head"
            ],
            "recommended_inspection": "Perform visual walkdown of sensor cable route along press column; measure 24V DC excitation with digital multimeter.",
            "recommended_action": "Reseat M12 connector, tighten DIN terminal block screws to 0.5 Nm, test sensor loop continuity before re-enabling zone."
        }

    # 3. High-Severity Catastrophic Oil Leakage
    if raw_signal_pct >= 90.0 or (raw_signal_pct >= 75.0 and pressure_bar < 120.0):
        return {
            "defect_type": "High-Severity Oil Leakage",
            "severity": EventSeverity.CRITICAL.value,
            "diagnosis_summary": f"Critical high-volume oil leak verified in {component_name}. Severe loss of hydraulic fluid with concurrent circuit pressure loss.",
            "detection_evidence": f"Oil leak sensor signal {raw_signal_pct:.1f}% (threshold {detection_threshold_pct:.1f}%), circuit pressure dropped to {pressure_bar:.1f} bar (nominal 160 bar), continuous persistence {duration_sec:.1f}s.",
            "possible_causes": [
                "Catastrophic burst of wire-braided high-pressure hose under cyclic fatigue",
                "Blown primary rod gland seal on 500-ton hydraulic cylinder",
                "SAE 4-bolt code 62 high-pressure flange O-ring extrusion",
                "Fatigue fracture along welded hydraulic manifold joint"
            ],
            "recommended_inspection": "IMMEDIATELY initiate controlled emergency cycle stop. Inspect press pit and secondary drip containment trays for oil accumulation.",
            "recommended_action": "Isolate hydraulic power unit (LOTO), depressurize circuit to 0 bar, replace burst flexible line and elastomeric seals, retorque flange fasteners to 95 Nm."
        }

    # 4. Gradual / Developing Oil Leakage
    if raw_signal_pct >= detection_threshold_pct and (pressure_bar >= 140.0) and duration_sec < 10.0:
        return {
            "defect_type": "Gradual Oil Leakage",
            "severity": EventSeverity.HIGH.value,
            "diagnosis_summary": f"Developing hydraulic fluid leak verified in {component_name}. Signal progressively exceeded threshold with early fluid loss.",
            "detection_evidence": f"Oil sensor reading {raw_signal_pct:.1f}% exceeded threshold {detection_threshold_pct:.1f}% for {duration_sec:.1f}s continuously. System pressure steady at {pressure_bar:.1f} bar.",
            "possible_causes": [
                "Hardened or degraded NBR/FKM O-ring seal from fluid thermal aging",
                "Micro-weep developing at threaded valve subplate port",
                "Compression fitting nut backing off due to high-cycle hydraulic pressure pulses"
            ],
            "recommended_inspection": "Use UV fluorescent dye tracer or clean lint-free wipe around pipe joints to locate exact seepage origin.",
            "recommended_action": "Schedule component seal overhaul at upcoming shift change, re-torque compression nuts to specified torque spec, verify oil reservoir makeup level."
        }

    # 5. Standard Hydraulic Oil Leakage
    if raw_signal_pct >= detection_threshold_pct:
        return {
            "defect_type": "Hydraulic Oil Leakage",
            "severity": EventSeverity.HIGH.value,
            "diagnosis_summary": f"Confirmed hydraulic fluid leakage in {component_name}. Persistence rule verified fluid presence.",
            "detection_evidence": f"Oil sensor raw reading {raw_signal_pct:.1f}% maintained above {detection_threshold_pct:.1f}% for {duration_sec:.1f}s (required {threshold_sec:.1f}s).",
            "possible_causes": [
                "Seal wear in dynamic hydraulic interface",
                "Fatigue fissure in high-pressure delivery pipe wall",
                "Gasket failure between valve body and mounting subplate"
            ],
            "recommended_inspection": "Inspect area surrounding {component_name} for pooling oil; check sensor deflector hood for accumulated fluid.",
            "recommended_action": "Depressurize zone, replace worn seal package, wipe sensor optical surface, conduct 10-cycle dry run to confirm dry joint."
        }

    # 6. Pressure Drop (Without Oil Leakage)
    if raw_signal_pct < 20.0 and pressure_bar < 130.0:
        return {
            "defect_type": "Pressure Drop",
            "severity": EventSeverity.MEDIUM.value,
            "diagnosis_summary": f"Systemic hydraulic pressure drop observed in {component_name} (down to {pressure_bar:.1f} bar). Optical oil leak sensor is clear (0% leak). Not a fluid leakage event.",
            "detection_evidence": f"Circuit pressure {pressure_bar:.1f} bar below minimum 145 bar tolerance. Oil leak sensor is nominal ({raw_signal_pct:.1f}%).",
            "possible_causes": [
                "Main pressure relief valve (PRV) spool sticking in open/bypass position",
                "Internal volumetric slip in axial piston pump due to swashplate or valve plate wear",
                "Nitrogen pre-charge loss in bladder-type hydraulic accumulator",
                "Directional control valve proportional solenoid spool binding"
            ],
            "recommended_inspection": "Measure pump case drain return flow to determine internal leakage rate; test accumulator gas pre-charge pressure.",
            "recommended_action": "Flush and recalibrate main relief valve cartridge, recharge accumulator bladder with dry nitrogen to 100 bar, inspect pump volumetric efficiency."
        }

    # 7. Abnormal Temperature
    if raw_signal_pct < 40.0 and temperature_c > 58.0:
        return {
            "defect_type": "Abnormal Temperature",
            "severity": EventSeverity.HIGH.value,
            "diagnosis_summary": f"Elevated fluid temperature ({temperature_c:.1f}°C) detected in {component_name}. Fluid is overheating without active leakage.",
            "detection_evidence": f"Fluid temperature {temperature_c:.1f}°C exceeded max threshold 58.0°C. Oil leak signal is clean ({raw_signal_pct:.1f}%).",
            "possible_causes": [
                "Air-to-oil heat exchanger cooling fan motor trip or clogged fin matrix",
                "High-pressure fluid continuously bypassing across worn relief valve converting hydraulic energy to heat",
                "Degraded fluid viscosity causing elevated shear friction"
            ],
            "recommended_inspection": "Inspect heat exchanger radiator core for particulate blockage; check thermostatic bypass valve opening temperature.",
            "recommended_action": "Clean cooler radiator matrix with compressed air, inspect water/fan cooling loop, test fluid sample for ISO 4406 particulate contamination."
        }

    # 8. Abnormal Flow Rate
    if raw_signal_pct < 40.0 and (flow_rate_lpm < 55.0 or flow_rate_lpm > 85.0):
        return {
            "defect_type": "Abnormal Flow Rate",
            "severity": EventSeverity.MEDIUM.value,
            "diagnosis_summary": f"Unusual delivery flow rate ({flow_rate_lpm:.1f} LPM) measured in {component_name} (nominal 72 LPM).",
            "detection_evidence": f"Flow rate reading {flow_rate_lpm:.1f} LPM outside normal operating envelope [60 - 80 LPM].",
            "possible_causes": [
                "Pump suction basket strainer partially clogged with oil varnish",
                "Inlet fluid cavitation from low oil level or cold fluid viscosity",
                "Proportional throttle valve spool calibration drift"
            ],
            "recommended_inspection": "Check suction line vacuum gauge; inspect reservoir oil level sight glass for aeration foam.",
            "recommended_action": "Clean suction strainer element, bleed air at pump casing vent port, recalibrate proportional valve driver card."
        }

    # Default Normal State
    return {
        "defect_type": "Normal Operation",
        "severity": EventSeverity.LOW.value,
        "diagnosis_summary": f"{component_name} operating within normal nominal parameters.",
        "detection_evidence": f"All telemetry within design limits: Oil {raw_signal_pct:.1f}%, Pressure {pressure_bar:.1f} bar, Temp {temperature_c:.1f}°C, Flow {flow_rate_lpm:.1f} LPM.",
        "possible_causes": [],
        "recommended_inspection": "Continue routine visual inspection per scheduled preventative maintenance (PM) card.",
        "recommended_action": "No corrective maintenance action required."
    }
