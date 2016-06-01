// INTERNAL MESSAGES
const 	C_PRESENTATION = 0; //!< Sent by a node when they present attached sensors. This is usually done in presentation() at startup.
const	C_SET = 1; //!< This message is sent from or to a sensor when a sensor value should be updated.
const	C_REQ = 2; //!< Requests a variable value (usually from an actuator destined for controller).
const	C_INTERNAL = 3; //!< Internal MySensors messages (also include common messages provided/generated by the library).
const	C_STREAM = 4; //!< For firmware and other larger chunks of data that need to be divided into pieces.

// SENSOR MESSAGES
const	S_DOOR = 0; // Door sensor; V_TRIPPED; V_ARMED
const	S_MOTION=1;  // Motion sensor; V_TRIPPED; V_ARMED 
const	S_SMOKE=2;  // Smoke sensor; V_TRIPPED; V_ARMED
const	S_LIGHT=3; // Binary light or relay; V_STATUS (or V_LIGHT); V_WATT
const	S_BINARY=3; // Binary light or relay; V_STATUS (or V_LIGHT); V_WATT (same as S_LIGHT)
const	S_DIMMER=4; // Dimmable light or fan device; V_STATUS (on/off); V_DIMMER (dimmer level 0-100); V_WATT
const	S_COVER=5; // Blinds or window cover; V_UP; V_DOWN; V_STOP; V_DIMMER (open/close to a percentage)
const	S_TEMP=6; // Temperature sensor; V_TEMP
const	S_HUM=7; // Humidity sensor; V_HUM
const	S_BARO=8; // Barometer sensor; V_PRESSURE; V_FORECAST
const	S_WIND=9; // Wind sensor; V_WIND; V_GUST
const	S_RAIN=10; // Rain sensor; V_RAIN; V_RAINRATE
const	S_UV=11; // Uv sensor; V_UV
const	S_WEIGHT=12; // Personal scale sensor; V_WEIGHT; V_IMPEDANCE
const	S_POWER=13; // Power meter; V_WATT; V_KWH
const	S_HEATER=14; // Header device; V_HVAC_SETPOINT_HEAT; V_HVAC_FLOW_STATE; V_TEMP
const	S_DISTANCE=15; // Distance sensor; V_DISTANCE
const	S_LIGHT_LEVEL=16; // Light level sensor; V_LIGHT_LEVEL (uncalibrated in percentage);  V_LEVEL (light level in lux)
const	S_ARDUINO_NODE=17; // Used (internally) for presenting a non-repeating Arduino node
const	S_ARDUINO_REPEATER_NODE=18; // Used (internally) for presenting a repeating Arduino node 
const	S_LOCK=19; // Lock device; V_LOCK_STATUS
const	S_IR=20; // Ir device; V_IR_SEND; V_IR_RECEIVE
const	S_WATER=21; // Water meter; V_FLOW; V_VOLUME
const	S_AIR_QUALITY=22; // Air quality sensor; V_LEVEL
const	S_CUSTOM=23; // Custom sensor 
const	S_DUST=24; // Dust sensor; V_LEVEL
const	S_SCENE_CONTROLLER=25; // Scene controller device; V_SCENE_ON; V_SCENE_OFF. 
const	S_RGB_LIGHT=26; // RGB light. Send color component data using V_RGB. Also supports V_WATT 
const	S_RGBW_LIGHT=27; // RGB light with an additional White component. Send data using V_RGBW. Also supports V_WATT
const	S_COLOR_SENSOR=28;  // Color sensor; send color information using V_RGB
const	S_HVAC=29; // Thermostat/HVAC device. V_HVAC_SETPOINT_HEAT; V_HVAC_SETPOINT_COLD; V_HVAC_FLOW_STATE; V_HVAC_FLOW_MODE; V_TEMP
const	S_MULTIMETER=30; // Multimeter device; V_VOLTAGE; V_CURRENT; V_IMPEDANCE 
const	S_SPRINKLER=31;  // Sprinkler; V_STATUS (turn on/off); V_TRIPPED (if fire detecting device)
const	S_WATER_LEAK=32; // Water leak sensor; V_TRIPPED; V_ARMED
const	S_SOUND=33; // Sound sensor; V_TRIPPED; V_ARMED; V_LEVEL (sound level in dB)
const	S_VIBRATION=34; // Vibration sensor; V_TRIPPED; V_ARMED; V_LEVEL (vibration in Hz)
const	S_MOISTURE=35; // Moisture sensor; V_TRIPPED; V_ARMED; V_LEVEL (water content or moisture in percentage?) 
const	S_INFO=36; // LCD text device / Simple information device on controller; V_TEXT
const	S_GAS=37; // Gas meter; V_FLOW; V_VOLUME
const	S_GPS=38; // GPS Sensor; V_POSITION
const	S_WATER_QUALITY=39;// V_TEMP; V_PH; V_ORP; V_EC; V_STATUS 

// VARIABLE TYPES
const	V_TEMP=0; // S_TEMP. Temperature S_TEMP; S_HEATER; S_HVAC
const	V_HUM=1; // S_HUM. Humidity
const	V_STATUS=2; //  S_LIGHT; S_DIMMER; S_SPRINKLER; S_HVAC; S_HEATER. Used for setting/reporting binary (on/off) status. 1=on; 0=off  
const	V_LIGHT=2; // Same as V_STATUS
const	V_PERCENTAGE=3; // S_DIMMER. Used for sending a percentage value 0-100 (%). 
const	V_DIMMER=3; // S_DIMMER. Same as V_PERCENTAGE.  
const	V_PRESSURE=4; // S_BARO. Atmospheric Pressure
const	V_FORECAST=5; // S_BARO. Whether forecast. string of "stable"; "sunny"; "cloudy"; "unstable"; "thunderstorm" or "unknown"
const	V_RAIN=6; // S_RAIN. Amount of rain
const	V_RAINRATE=7; // S_RAIN. Rate of rain
const	V_WIND=8; // S_WIND. Wind speed
const	V_GUST=9;  // S_WIND. Gust
const	V_DIRECTION=10; // S_WIND. Wind direction 0-360 (degrees)
const	V_UV=11; // S_UV. UV light level
const	V_WEIGHT=12; // S_WEIGHT. Weight(for scales etc)
const	V_DISTANCE=13; // S_DISTANCE. Distance
const	V_IMPEDANCE=14; // S_MULTIMETER; S_WEIGHT. Impedance value
const	V_ARMED=15; // S_DOOR; S_MOTION; S_SMOKE; S_SPRINKLER. Armed status of a security sensor. 1 = Armed; 0 = Bypassed
const	V_TRIPPED=16; // S_DOOR; S_MOTION; S_SMOKE; S_SPRINKLER; S_WATER_LEAK; S_SOUND; S_VIBRATION; S_MOISTURE. Tripped status of a security sensor. 1 = Tripped; 0
const	V_WATT=17; // S_POWER; S_LIGHT; S_DIMMER; S_RGB; S_RGBW. Watt value for power meters
const	V_KWH=18; // S_POWER. Accumulated number of KWH for a power meter
const	V_SCENE_ON=19; // S_SCENE_CONTROLLER. Turn on a scene
const	V_SCENE_OFF=20; // S_SCENE_CONTROLLER. Turn of a scene
const	V_HEATER=21; // Deprecated. Use V_HVAC_FLOW_STATE instead.
const	V_HVAC_FLOW_STATE=21;  // S_HEATER; S_HVAC. HVAC flow state ("Off"; "HeatOn"; "CoolOn"; or "AutoChangeOver") 
const	V_HVAC_SPEED=22; // S_HVAC; S_HEATER. HVAC/Heater fan speed ("Min"; "Normal"; "Max"; "Auto") 
const	V_LIGHT_LEVEL=23; // S_LIGHT_LEVEL. Uncalibrated light level. 0-100%. Use V_LEVEL for light level in lux
const	V_VAR1=24; 
const   V_VAR2=25; 
const   V_VAR3=26; 
const   V_VAR4=27; 
const   V_VAR5=28;
const	V_UP=29; // S_COVER. Window covering. Up
const	V_DOWN=30; // S_COVER. Window covering. Down
const	V_STOP=31; // S_COVER. Window covering. Stop
const	V_IR_SEND=32; // S_IR. Send out an IR-command
const	V_IR_RECEIVE=33; // S_IR. This message contains a received IR-command
const	V_FLOW=34; // S_WATER. Flow of water (in meter)
const	V_VOLUME=35; // S_WATER. Water volume
const	V_LOCK_STATUS=36; // S_LOCK. Set or get lock status. 1=Locked; 0=Unlocked
const	V_LEVEL=37; // S_DUST; S_AIR_QUALITY; S_SOUND (dB); S_VIBRATION (hz); S_LIGHT_LEVEL (lux)
const	V_VOLTAGE=38; // S_MULTIMETER 
const	V_CURRENT=39; // S_MULTIMETER
const	V_RGB=40; 	// S_RGB_LIGHT; S_COLOR_SENSOR. 
					// Used for sending color information for multi color LED lighting or color sensors. 
					// Sent as ASCII hex: RRGGBB (RR=red; GG=green; BB=blue component)
const	V_RGBW=41; // S_RGBW_LIGHT
					// Used for sending color information to multi color LED lighting. 
					// Sent as ASCII hex: RRGGBBWW (WW=white component)
const   V_ID=42;   // S_TEMP
					// Used for sending in sensors hardware ids (i.e. OneWire DS1820b). 
const	V_UNIT_PREFIX=43; 	// S_DUST; S_AIR_QUALITY
					// Allows sensors to send in a string representing the 
					// unit prefix to be displayed in GUI; not parsed by controller! E.g. cm; m; km; inch.
					// Can be used for S_DISTANCE or gas concentration
const	V_HVAC_SETPOINT_COOL=44; // S_HVAC. HVAC cool setpoint (Integer between 0-100)
const	V_HVAC_SETPOINT_HEAT=45; // S_HEATER; S_HVAC. HVAC/Heater setpoint (Integer between 0-100)
const	V_HVAC_FLOW_MODE=46; // S_HVAC. Flow mode for HVAC ("Auto"; "ContinuousOn"; "PeriodicOn")
const	V_TEXT=47; // S_INFO. Text message to display on LCD or controller device
const	V_CUSTOM=48; 		// Custom messages used for controller/inter node specific commands; preferably using S_CUSTOM device type.
const	V_POSITION=49;	    // GPS position and altitude. Payload: latitude;longitude;altitude(m). E.g. "55.722526;13.017972;18"
const	V_IR_RECORD=50;         // Record IR codes S_IR for playback
const	V_PH=51; // S_WATER_QUALITY; water PH
const   V_ORP=52; // S_WATER_QUALITY; water ORP : redox potential in mV
const   V_EC=53;// S_WATER_QUALITY; water electric conductivity μS/cm (microSiemens/cm)

// INTERNAL TYPES
const   I_BATTERY_LEVEL=0; 
const   I_TIME=1; 
const   I_VERSION=2; 
const   I_ID_REQUEST=3; 
const   I_ID_RESPONSE=4;
const   I_INCLUSION_MODE=5; 
const   I_CONFIG=6; 
const   I_FIND_PARENT=7; 
const   I_FIND_PARENT_RESPONSE=8;
const   I_LOG_MESSAGE=9; 
const   I_CHILDREN=10; 
const   I_SKETCH_NAME=11; 
const   I_SKETCH_VERSION=12;
const   I_REBOOT=13; 
const   I_GATEWAY_READY=14;
const   I_SIGNING_PRESENTATION=15; 
const   I_NONCE_REQUEST=16;        
const   I_NONCE_RESPONSE=17;       
const   I_HEARTBEAT=18; 
const   I_PRESENTATION=19; 
const   I_DISCOVER=20; 
const   I_DISCOVER_RESPONSE=21; 
const   I_HEARTBEAT_RESPONSE=22;
const   I_CHANNEL=23;
const   I_LOCKED=24;       

// STREAM MESSAGE TYPES
const   ST_FIRMWARE_CONFIG_REQUEST=0;
const   ST_FIRMWARE_CONFIG_RESPONSE=1;
const   ST_FIRMWARE_REQUEST=3; 
const   ST_FIRMWARE_RESPONSE=4;
const   ST_SOUND=5; 
const   ST_IMAGE=6;

// PAYLOAD TYPES
const   P_STRING=0; 
const   P_BYTE=1; 
const   P_INT16=2; 
const   P_UINT16=3; 
const   P_LONG32=4; 
const   P_ULONG32=5; 
const   P_CUSTOM=6; 
const   P_FLOAT32=7;   

const BROADCAST_ADDRESS = 255;
const NODE_SENSOR_ID = 255;