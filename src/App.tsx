import { useEffect, useRef, useState } from 'react'

import {
  Viewer,
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  WebMapServiceImageryProvider,
  UrlTemplateImageryProvider,
  ImageryLayer,
  Rectangle,
  Model,
  Transforms,
  HeadingPitchRoll,
  Matrix4,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  PolylineGlowMaterialProperty,
  Math as CesiumMath,
} from 'cesium'

import 'cesium/Build/Cesium/Widgets/widgets.css'
import './App.css'
const EQUIPMENT_WFS_URL =
  "http://localhost/qgis/qgis_mapserv.fcgi.exe?MAP=D:/Users/0590272403/Desktop/Company_GIS/qgis/secondone.qgz&SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=equipment&OUTPUTFORMAT=application/vnd.geo%2Bjson";

const QGIS_WFS_BASE_URL =
  "http://localhost/qgis/qgis_mapserv.fcgi.exe?MAP=D:/Users/0590272403/Desktop/Company_GIS/qgis/secondone.qgz&SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&SRSNAME=EPSG:4326&OUTPUTFORMAT=application/vnd.geo%2Bjson";

type UndergroundNetworkKey =
  | 'electrical'
  | 'fiber'
  | 'gas'
  | 'sewer'

const UNDERGROUND_NETWORKS: Record<
  UndergroundNetworkKey,
  {
    typeName: string
    label: string
    depth: number
    color: string
    width: number
    glowPower: number
  }
> = {
  electrical: {
    typeName: 'electrical_lines',
    label: 'Ø¨Ø±Ù‚',
    depth: -2.0,
    color: '#FF6A3D',
    width: 5,
    glowPower: 0.34,
  },

  fiber: {
    typeName: 'fiber_lines',
    label: 'ÙÛŒØ¨Ø± Ù†ÙˆØ±ÛŒ',
    depth: -6.0,
    color: '#34C9FF',
    width: 4,
    glowPower: 0.42,
  },

  gas: {
    typeName: 'gas_lines',
    label: 'Ú¯Ø§Ø²',
    depth: -12.0,
    color: '#FFD44A',
    width: 6,
    glowPower: 0.30,
  },

  sewer: {
    typeName: 'sewer_lines',
    label: 'ÙØ§Ø¶Ù„Ø§Ø¨',
    depth: -20.0,
    color: '#2EF2A4',
    width: 6,
    glowPower: 0.30,
  },
}
// ============================================================
// TYPES
// ============================================================

type Site = {
  id: string
  name: string
  subtitle: string
  mapLabel: string
  lat: number
  lon: number
}

type BaseMapType =
  | 'eox'
  | 'offline'
  | 'osm'

// ============================================================
// NIKSUN SITES
// ============================================================

const sites: Site[] = [
  {
    id: 'UNIT_02',
    name: 'ÙˆØ§Ø­Ø¯ 2',
    subtitle: 'Ù…Ø¬Ù…ÙˆØ¹Ù‡ ØªÙˆÙ„ÛŒØ¯ÛŒ Ù†ÛŒÚ©Ø³Ø§Ù†',
    mapLabel: 'UNIT 02',
    lat: 35.1086073819,
    lon: 50.3840880099,
  },

  {
    id: 'UNIT_03',
    name: 'ÙˆØ§Ø­Ø¯ Ú©Ø§ÙˆÙ‡',
    subtitle: 'Ù…Ø¬Ù…ÙˆØ¹Ù‡ ØªÙˆÙ„ÛŒØ¯ÛŒ Ù†ÛŒÚ©Ø³Ø§Ù†',
    mapLabel: 'UNIT 03',
    lat: 35.1110337439,
    lon: 50.3844274664,
  },

  {
    id: 'AFTER_SALES',
    name: 'Ø®Ø¯Ù…Ø§Øª Ù¾Ø³ Ø§Ø² ÙØ±ÙˆØ´',
    subtitle: 'Ø®Ø¯Ù…Ø§Øª Ù¾Ø³ Ø§Ø² ÙØ±ÙˆØ´',
    mapLabel: 'AFTER SALES',
    lat: 35.085837003429134,
    lon: 50.40245246731269,
  },

  {
    id: 'TEHRAN_SALES',
    name: 'ÙˆØ§Ø­Ø¯ ØªÙ‡Ø±Ø§Ù†',
    subtitle: 'Ø¯ÙØªØ± ÙØ±ÙˆØ´',
    mapLabel: 'TEHRAN',
    lat: 35.735635,
    lon: 51.415871,
  },
]

const SITE_TAB_LABELS: Record<string, string> = {
  UNIT_02: 'ÙˆØ§Ø­Ø¯ 2',
  UNIT_03: 'ÙˆØ§Ø­Ø¯ Ú©Ø§ÙˆÙ‡',
  AFTER_SALES: 'Ø®Ø¯Ù…Ø§Øª Ù¾Ø³ Ø§Ø² ÙØ±ÙˆØ´',
  TEHRAN_SALES: 'ÙˆØ§Ø­Ø¯ ØªÙ‡Ø±Ø§Ù†',
}

// ============================================================
// FACTORY MODEL
// ============================================================

const FACTORY_MODEL = {
  lon: 50.3836395925,
  lat: 35.1108878141,

  height: 0,

  eastOffset: 0,
  northOffset: 0,
  upOffset: 0,

  heading: 90,
  pitch: 0,
  roll: 0,

  scale: 1.0,
}

const FACTORY_MODEL_URL =
  '/models/factory/NIKSUN_FACTORY_150M_SIDEWALL_BRICK_43_57.gltf'

// ============================================================
// EQUIPMENT / MACHINE MODELS
// ============================================================
type MachineType = 'A' | 'B' | 'C'

type EquipmentProperties = {
  id: string | number
  machine_type: string
  name?: string | null
  model?: string | null
  status?: string | null
  clamp_force_ton?: number | null
  length?: number | null
  width?: number | null
  area_id?: string | null
  building_id?: string | null
  manufacturer?: string | null
  serial_number?: string | null
  installation_date?: string | null
  last_maintenance_date?: string | null
  next_maintenance_date?: string | null
  description?: string | null
  [key: string]: unknown
}

type EquipmentFeature = {
  type: 'Feature'
  id?: string
  geometry: {
    type: 'Point'
    coordinates: number[]
  } | null
  properties: EquipmentProperties
}

type EquipmentFeatureCollection = {
  type: 'FeatureCollection'
  features: EquipmentFeature[]
}

type UndergroundLineProperties = {
  id?: string | number
  layer?: string | null
  linetype?: string | null
  elevation?: number | null
  base_z?: number | null
  depth?: number | null
  diameter?: number | null
  material?: string | null
  slope?: number | null
  [key: string]: unknown
}

type UndergroundLineFeature = {
  type: 'Feature'
  id?: string
  geometry: {
    type:
      | 'LineString'
      | 'MultiLineString'
    coordinates:
      | number[][]
      | number[][][]
  } | null
  properties: UndergroundLineProperties
}

type UndergroundLineFeatureCollection = {
  type: 'FeatureCollection'
  features: UndergroundLineFeature[]
}

type SelectedMachine = {
  type: 'machine'
  equipmentId: number
  machineType: MachineType
  longitude: number
  latitude: number
  properties: EquipmentProperties
}

type CameraAsset = {
  id: string
  name: string
  model: string
  siteId: string
  siteName: string
  locationLabel: string
  ip: string
  streamPath: string
  streamUrl: string
  latitude: number
  longitude: number
  height: number
}

// Pilot CCTV camera - temporary map position near the Unit 03 hall entrance.
// After the visual check, only latitude / longitude need to be fine-tuned.
const CAMERA_01: CameraAsset = {
  id: 'CAM_01',
  name: 'Ø¯ÙˆØ±Ø¨ÛŒÙ† ÙˆØ±ÙˆØ¯ÛŒ Ø³ÙˆÙ„Ù‡',
  model: 'DH-IPC-HDW2441TM-S',
  siteId: 'UNIT_03',
  siteName: 'ÙˆØ§Ø­Ø¯ Ú©Ø§ÙˆÙ‡',
  locationLabel: 'Ù†Ø²Ø¯ÛŒÚ© Ø¯Ø± ÙˆØ±ÙˆØ¯ÛŒ Ø³ÙˆÙ„Ù‡ - ÙˆØ§Ø­Ø¯ 3',
  ip: '192.0.2.10',
  streamPath: 'cam01',
  streamUrl: 'http://localhost:8889/cam01',
  latitude: 35.110830,
  longitude: 50.384310,
  height: 4.0,
}

const CAMERA_ICON =
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="31" fill="#071a2d" fill-opacity="0.94" stroke="#48d7ff" stroke-width="3"/>
      <rect x="18" y="25" width="29" height="22" rx="5" fill="#0d3551" stroke="#7ce6ff" stroke-width="2"/>
      <path d="M47 31 L59 25 L59 47 L47 41 Z" fill="#1598c7" stroke="#7ce6ff" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="31" cy="36" r="5" fill="#48d7ff"/>
    </svg>
  `)}`

const isMachineType = (
  value: unknown,
): value is MachineType =>
  value === 'A' ||
  value === 'B' ||
  value === 'C'

const MACHINE_MODELS: Record<
  MachineType,
  {
    url: string
    scale: number
    heading: number
  }
> = {
  A: {
    url: '/models/machines/a_equipment.glb',
    scale: 1,
    heading: 0,
  },

  B: {
    url: '/models/machines/b_equipment.glb',
    scale: 1,
    heading: 0,
  },

  C: {
    url: '/models/machines/c_equipment.glb',
    scale: 1,
    heading: 0,
  },
}

// ============================================================
// OFFLINE MAP PATHS
// ============================================================

const OFFLINE_IRAN_URL =
  '/maps/iran/{z}/{x}/{y}.png'

const OFFLINE_SAVEH_URL =
  '/maps/saveh/{z}/{x}/{y}.png'

const OFFLINE_TEHRAN_URL =
  '/maps/tehran/{z}/{x}/{y}.png'

// ============================================================
// UNIT 02 + UNIT 03 CENTER
// ============================================================

const UNIT_02_03_CENTER = {
  lat: 35.1098205629,
  lon: 50.38425773815,
}

// ============================================================
// APP
// ============================================================

function App() {

  const cesiumContainer =
    useRef<HTMLDivElement>(null)

  const viewerRef =
    useRef<Viewer | null>(null)

  const factoryModelRef =
    useRef<Model | null>(null)

  const machineModelsRef =
    useRef<Model[]>([])

  const undergroundEntityIdsRef =
    useRef<Record<UndergroundNetworkKey, string[]>>({
      electrical: [],
      fiber: [],
      gas: [],
      sewer: [],
    })

  const undergroundVisibilityRef =
    useRef<Record<UndergroundNetworkKey, boolean>>({
      electrical: false,
      fiber: false,
      gas: false,
      sewer: false,
    })

  const imageryLayersRef =
    useRef<{
      eox?: ImageryLayer
      osm?: ImageryLayer
      offlineIran?: ImageryLayer
      offlineSaveh?: ImageryLayer
      offlineTehran?: ImageryLayer
    }>({})

  const [activeSite, setActiveSite] =
    useState<string | null>(null)

  const [baseMap, setBaseMap] =
    useState<BaseMapType>('eox')

  const [selectedMachine, setSelectedMachine] =
    useState<SelectedMachine | null>(null)

  const [selectedCamera, setSelectedCamera] =
    useState<CameraAsset | null>(null)

  const [electricalVisible, setElectricalVisible] =
    useState(false)

  const [fiberVisible, setFiberVisible] =
    useState(false)

  const [gasVisible, setGasVisible] =
    useState(false)

  const [sewerVisible, setSewerVisible] =
    useState(false)

  const [undergroundMode, setUndergroundMode] =
    useState(false)

  const setNetworkVisibility = (
    network: UndergroundNetworkKey,
    visible: boolean,
  ) => {

    undergroundVisibilityRef.current[
      network
    ] =
      visible

    if (network === 'electrical') {
      setElectricalVisible(
        visible,
      )
    }

    if (network === 'fiber') {
      setFiberVisible(
        visible,
      )
    }

    if (network === 'gas') {
      setGasVisible(
        visible,
      )
    }

    if (network === 'sewer') {
      setSewerVisible(
        visible,
      )
    }
  }

  const toggleUndergroundMode = () => {
    setUndergroundMode(
      (current) => {
        const next =
          !current

        if (next) {
          ;(
            [
              'electrical',
              'fiber',
              'gas',
              'sewer',
            ] as UndergroundNetworkKey[]
          ).forEach(
            (network) => {
              undergroundVisibilityRef.current[
                network
              ] =
                true
            },
          )

          setElectricalVisible(
            true,
          )

          setFiberVisible(
            true,
          )

          setGasVisible(
            true,
          )

          setSewerVisible(
            true,
          )
        }

        return next
      },
    )
  }

  type UndergroundCameraView =
    | 'oblique'
    | 'top'
    | 'side'

  const flyUndergroundCamera = (
    view:
      UndergroundCameraView,
  ) => {

    const viewer =
      viewerRef.current

    if (
      !viewer ||
      viewer.isDestroyed()
    ) {
      return
    }

    if (view === 'top') {

      viewer.camera.flyTo({
        destination:
          Cartesian3.fromDegrees(
            UNIT_02_03_CENTER.lon,
            UNIT_02_03_CENTER.lat,
            430,
          ),

        orientation: {
          heading:
            CesiumMath.toRadians(
              0,
            ),

          pitch:
            CesiumMath.toRadians(
              -90,
            ),

          roll:
            0,
        },

        duration:
          1.25,
      })

      return
    }

    if (view === 'side') {

      viewer.camera.flyTo({
        destination:
          Cartesian3.fromDegrees(
            UNIT_02_03_CENTER.lon - 0.0036,
            UNIT_02_03_CENTER.lat - 0.0003,
            72,
          ),

        orientation: {
          heading:
            CesiumMath.toRadians(
              88,
            ),

          pitch:
            CesiumMath.toRadians(
              -10,
            ),

          roll:
            0,
        },

        duration:
          1.35,
      })

      return
    }

    viewer.camera.flyTo({
      destination:
        Cartesian3.fromDegrees(
          UNIT_02_03_CENTER.lon - 0.0022,
          UNIT_02_03_CENTER.lat - 0.0034,
          210,
        ),

      orientation: {
        heading:
          CesiumMath.toRadians(
            28,
          ),

        pitch:
          CesiumMath.toRadians(
            -29,
          ),

        roll:
          0,
      },

      duration:
        1.35,
    })
  }

  // ==========================================================
  // INITIALIZE CESIUM
  // ==========================================================

  useEffect(() => {

    if (!cesiumContainer.current) {
      return
    }

    // ========================================================
    // VIEWER
    // ========================================================

    const viewer =
      new Viewer(
        cesiumContainer.current,
        {
          baseLayer: false,
          baseLayerPicker: false,

          timeline: false,
          animation: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,

          scene3DOnly: true,
        },
      )

    viewerRef.current =
      viewer

    // ========================================================
    // GLOBE
    // ========================================================

    viewer.scene.globe.baseColor =
      Color.fromCssColorString(
        '#08111f',
      )

    viewer.scene.globe.enableLighting =
      false

    // ========================================================
    // OFFLINE IRAN
    // ========================================================

    const offlineIranProvider =
      new UrlTemplateImageryProvider({
        url:
          OFFLINE_IRAN_URL,

        minimumLevel: 3,
        maximumLevel: 4,

        rectangle:
          Rectangle.fromDegrees(
            44.0,
            24.0,
            64.0,
            40.0,
          ),

        credit:
          'NIKSUN Offline Iran',
      })

    const offlineIranLayer =
      viewer.imageryLayers
        .addImageryProvider(
          offlineIranProvider,
        )

    offlineIranLayer.show =
      false

    imageryLayersRef.current.offlineIran =
      offlineIranLayer

    // ========================================================
    // OFFLINE SAVEH
    // ========================================================

    const offlineSavehProvider =
      new UrlTemplateImageryProvider({
        url:
          OFFLINE_SAVEH_URL,

        minimumLevel: 15,
        maximumLevel: 17,

        rectangle:
          Rectangle.fromDegrees(
            50.30,
            35.00,
            50.48,
            35.20,
          ),

        credit:
          'NIKSUN Offline Saveh',
      })

    const offlineSavehLayer =
      viewer.imageryLayers
        .addImageryProvider(
          offlineSavehProvider,
        )

    offlineSavehLayer.show =
      false

    imageryLayersRef.current.offlineSaveh =
      offlineSavehLayer

    // ========================================================
    // OFFLINE TEHRAN
    // ========================================================

    const offlineTehranProvider =
      new UrlTemplateImageryProvider({
        url:
          OFFLINE_TEHRAN_URL,

        minimumLevel: 15,
        maximumLevel: 16,

        rectangle:
          Rectangle.fromDegrees(
            51.25,
            35.60,
            51.58,
            35.85,
          ),

        credit:
          'NIKSUN Offline Tehran',
      })

    const offlineTehranLayer =
      viewer.imageryLayers
        .addImageryProvider(
          offlineTehranProvider,
        )

    offlineTehranLayer.show =
      false

    imageryLayersRef.current.offlineTehran =
      offlineTehranLayer

    // ========================================================
    // EOX SATELLITE
    // ========================================================

    const eoxProvider =
      new WebMapServiceImageryProvider({
        url:
          'https://tiles.maps.eox.at/map',

        layers:
          's2cloudless',

        parameters: {
          transparent: false,
          format: 'image/jpeg',
        },

        credit:
          'EOxCloudless / Copernicus Sentinel',
      })

    const eoxLayer =
      viewer.imageryLayers
        .addImageryProvider(
          eoxProvider,
        )

    eoxLayer.show =
      true

    imageryLayersRef.current.eox =
      eoxLayer

    // ========================================================
    // OPENSTREETMAP
    // ========================================================

    const osmProvider =
      new UrlTemplateImageryProvider({
        url:
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',

        minimumLevel: 0,
        maximumLevel: 19,

        credit:
          'Â© OpenStreetMap contributors',
      })

    const osmLayer =
      viewer.imageryLayers
        .addImageryProvider(
          osmProvider,
        )

    osmLayer.show =
      false

    imageryLayersRef.current.osm =
      osmLayer
    // ========================================================
    // CAMERA - IRAN
    // ========================================================

    viewer.camera.setView({
      destination:
        Cartesian3.fromDegrees(
          53.4,
          32.2,
          2600000,
        ),
    })

    // ========================================================
    // LOAD FACTORY
    // ========================================================

    const loadFactoryModel =
      async () => {

        try {

          const anchor =
            Cartesian3.fromDegrees(
              FACTORY_MODEL.lon,
              FACTORY_MODEL.lat,
              FACTORY_MODEL.height,
            )

          const hpr =
            new HeadingPitchRoll(
              CesiumMath.toRadians(
                FACTORY_MODEL.heading,
              ),

              CesiumMath.toRadians(
                FACTORY_MODEL.pitch,
              ),

              CesiumMath.toRadians(
                FACTORY_MODEL.roll,
              ),
            )

          const modelMatrix =
            Transforms
              .headingPitchRollToFixedFrame(
                anchor,
                hpr,
              )

          const offset =
            new Cartesian3(
              FACTORY_MODEL.eastOffset,
              FACTORY_MODEL.northOffset,
              FACTORY_MODEL.upOffset,
            )

          const finalModelMatrix =
            Matrix4.multiplyByTranslation(
              modelMatrix,
              offset,
              new Matrix4(),
            )

          const model =
            await Model.fromGltfAsync({
              url:
                FACTORY_MODEL_URL,

              modelMatrix:
                finalModelMatrix,

              scale:
                FACTORY_MODEL.scale,

              minimumPixelSize:
                0,
            })

          if (
            viewer.isDestroyed()
          ) {
            model.destroy()
            return
          }

          model.backFaceCulling =
            false

          viewer.scene.primitives.add(
            model,
          )

          factoryModelRef.current =
            model

          console.log(
            'NIKSUN FACTORY MODEL LOADED',
          )

        }

        catch (error) {

          console.error(
            'FACTORY MODEL ERROR:',
            error,
          )

        }
      }

    // ========================================================
    // LOAD MACHINES FROM WFS
    // ========================================================

    const loadMachines =
      async () => {

        try {

          const response =
            await fetch(
              EQUIPMENT_WFS_URL,
            )

          if (!response.ok) {
            throw new Error(
              `WFS HTTP error: ${response.status}`,
            )
          }

          const data =
            await response.json() as EquipmentFeatureCollection

          if (
            !Array.isArray(
              data.features,
            )
          ) {
            throw new Error(
              'Invalid WFS response: features array not found',
            )
          }

          if (viewer.isDestroyed()) {
            return
          }

          let loadedCount =
            0

          for (
            const feature
            of data.features
          ) {

            if (viewer.isDestroyed()) {
              return
            }

            if (
              !feature.geometry ||
              feature.geometry.type !== 'Point' ||
              !Array.isArray(
                feature.geometry.coordinates,
              ) ||
              feature.geometry.coordinates.length < 2
            ) {
              console.warn(
                'SKIPPED EQUIPMENT: invalid Point geometry',
                feature,
              )
              continue
            }

            const [
              lon,
              lat,
            ] =
              feature.geometry.coordinates

            if (
              !Number.isFinite(lon) ||
              !Number.isFinite(lat)
            ) {
              console.warn(
                'SKIPPED EQUIPMENT: invalid coordinates',
                feature,
              )
              continue
            }

            const machineTypeValue =
              feature.properties.machine_type

            if (
              !isMachineType(
                machineTypeValue,
              )
            ) {
              console.warn(
                'SKIPPED EQUIPMENT: invalid machine_type',
                feature.properties,
              )
              continue
            }

            const machineType =
              machineTypeValue

            const equipmentId =
              Number(
                feature.properties.id,
              )

            if (
              !Number.isFinite(
                equipmentId,
              )
            ) {
              console.warn(
                'SKIPPED EQUIPMENT: invalid equipment id',
                feature.properties,
              )
              continue
            }

            const config =
              MACHINE_MODELS[
                machineType
              ]

            // --------------------------------------------------
            // ABSOLUTE WFS / QGIS POSITION
            // --------------------------------------------------

            const machinePosition =
              Cartesian3.fromDegrees(
                lon,
                lat,
                0,
              )

            // --------------------------------------------------
            // ORIENTATION
            //
            // ID 1 proved:
            // heading = 0
            // pitch   = 0
            // roll    = 0
            // --------------------------------------------------

            const machineHpr =
              new HeadingPitchRoll(
                CesiumMath.toRadians(
                  config.heading,
                ),
                0,
                0,
              )

            const machineModelMatrix =
              Transforms
                .headingPitchRollToFixedFrame(
                  machinePosition,
                  machineHpr,
                )

            // --------------------------------------------------
            // LOAD A / B / C
            // --------------------------------------------------

            const model =
              await Model.fromGltfAsync({
                url:
                  config.url,

                modelMatrix:
                  machineModelMatrix,

                scale:
                  config.scale,

                minimumPixelSize:
                  0,

                allowPicking:
                  true,

                id: {
                  type:
                    'machine',

                  equipmentId,

                  machineType,

                  longitude:
                    lon,

                  latitude:
                    lat,

                  properties:
                    feature.properties,
                },
              })

            if (
              viewer.isDestroyed()
            ) {
              model.destroy()
              return
            }

            model.backFaceCulling =
              false

            viewer.scene.primitives.add(
              model,
            )

            machineModelsRef.current.push(
              model,
            )

            loadedCount +=
              1

            console.log(
              `MACHINE ${equipmentId} / ${machineType} LOADED FROM WFS`,
            )
          }

          console.log(
            `ALL ${loadedCount} MACHINES LOADED FROM WFS`,
          )

        }

        catch (error) {

          console.error(
            'MACHINE WFS LOAD ERROR:',
            error,
          )
        }
      }

    // ========================================================
    // LOAD UNDERGROUND NETWORKS FROM WFS
    // ========================================================

    const loadUndergroundNetwork =
      async (
        networkKey:
          UndergroundNetworkKey,
      ) => {

        const config =
          UNDERGROUND_NETWORKS[
            networkKey
          ]

        try {

          const response =
            await fetch(
              `${QGIS_WFS_BASE_URL}&TYPENAME=${config.typeName}`,
            )

          if (!response.ok) {
            throw new Error(
              `${config.typeName} WFS HTTP error: ${response.status}`,
            )
          }

          const data =
            await response.json() as UndergroundLineFeatureCollection

          if (
            !Array.isArray(
              data.features,
            )
          ) {
            throw new Error(
              `Invalid ${config.typeName} WFS response: features array not found`,
            )
          }

          let loadedSegmentCount =
            0

          for (
            const feature
            of data.features
          ) {

            if (
              viewer.isDestroyed()
            ) {
              return
            }

            if (
              !feature.geometry ||
              (
                feature.geometry.type !== 'LineString' &&
                feature.geometry.type !== 'MultiLineString'
              )
            ) {
              console.warn(
                `SKIPPED ${config.typeName}: invalid geometry`,
                feature,
              )
              continue
            }

            const featureId =
              String(
                feature.properties.id ??
                feature.id ??
                loadedSegmentCount + 1,
              )

            const lineGroups =
              feature.geometry.type === 'LineString'
                ? [
                    feature.geometry.coordinates as number[][],
                  ]
                : feature.geometry.coordinates as number[][][]

            lineGroups.forEach(
              (
                lineCoordinates,
                lineIndex,
              ) => {

                const positions =
                  lineCoordinates
                    .filter(
                      (coordinate) =>
                        Array.isArray(coordinate) &&
                        coordinate.length >= 2 &&
                        Number.isFinite(coordinate[0]) &&
                        Number.isFinite(coordinate[1]),
                    )
                    .map(
                      (coordinate) =>
                        Cartesian3.fromDegrees(
                          coordinate[0],
                          coordinate[1],
                          config.depth,
                        ),
                    )

                if (
                  positions.length < 2
                ) {
                  return
                }

                const entityId =
                  `${networkKey}-${featureId}-${lineIndex}`

                const networkColor =
                  Color
                    .fromCssColorString(
                      config.color,
                    )

                viewer.entities.add({
                  id:
                    entityId,

                  name:
                    `${config.label} ${featureId}`,

                  show:
                    undergroundVisibilityRef.current[
                      networkKey
                    ],

                  properties: {
                    networkType:
                      networkKey,

                    visualDepth:
                      config.depth,

                    sourceProperties:
                      feature.properties,
                  },

                  polyline: {
                    positions,

                    width:
                      config.width,

                    material:
                      new PolylineGlowMaterialProperty({
                        glowPower:
                          config.glowPower,

                        taperPower:
                          0.65,

                        color:
                          networkColor
                            .withAlpha(
                              0.97,
                            ),
                      }),

                    depthFailMaterial:
                      networkColor
                        .withAlpha(
                          0.38,
                        ),
                  },
                })

                undergroundEntityIdsRef.current[
                  networkKey
                ].push(
                  entityId,
                )

                loadedSegmentCount +=
                  1
              },
            )
          }

          console.log(
            `${config.typeName.toUpperCase()} WFS LOADED: ${loadedSegmentCount} SEGMENTS @ ${config.depth}m`,
          )

        }

        catch (error) {

          console.error(
            `${config.typeName.toUpperCase()} WFS LOAD ERROR:`,
            error,
          )
        }
      }

    loadFactoryModel()
    loadMachines()

    ;(
      [
        'electrical',
        'fiber',
        'gas',
        'sewer',
      ] as UndergroundNetworkKey[]
    ).forEach(
      (networkKey) => {
        loadUndergroundNetwork(
          networkKey,
        )
      },
    )

    // ========================================================
    // CLICK MACHINE MODEL
    // ========================================================

    const machineClickHandler =
      new ScreenSpaceEventHandler(
        viewer.scene.canvas,
      )

    machineClickHandler.setInputAction(
      (movement: { position: Cartesian2 }) => {

        const pickedObject =
          viewer.scene.pick(
            movement.position,
          ) as {
            id?: unknown
            primitive?: {
              id?: unknown
            }
          } | undefined

        const pickedId =
          (
            pickedObject?.id ??
            pickedObject?.primitive?.id
          ) as SelectedMachine | undefined

        if (
          !pickedId ||
          pickedId.type !== 'machine'
        ) {
          return
        }

        setSelectedMachine(
          pickedId,
        )

        setSelectedCamera(
          null,
        )

        console.log(
          'SELECTED MACHINE:',
          pickedId.equipmentId,
          pickedId.properties,
        )
      },
      ScreenSpaceEventType.LEFT_CLICK,
    )

    // ========================================================
    // SITE MARKERS
    // ========================================================

    sites.forEach(
      (site) => {

        viewer.entities.add({

          id:
            site.id,

          position:
            Cartesian3.fromDegrees(
              site.lon,
              site.lat,
              50,
            ),

          point: {

            pixelSize:
              17,

            color:
              Color.fromCssColorString(
                '#1677FF',
              ),

            outlineColor:
              Color.WHITE,

            outlineWidth:
              3,

            disableDepthTestDistance:
              Number.POSITIVE_INFINITY,
          },

          label: {

            text:
              site.mapLabel,

            font:
              'bold 14px Arial',

            fillColor:
              Color.WHITE,

            showBackground:
              true,

            backgroundColor:
              Color
                .fromCssColorString(
                  '#122149',
                )
                .withAlpha(
                  0.88,
                ),

            horizontalOrigin:
              HorizontalOrigin.CENTER,

            verticalOrigin:
              VerticalOrigin.BOTTOM,

            pixelOffset:
              new Cartesian2(
                0,
                -23,
              ),

            disableDepthTestDistance:
              Number.POSITIVE_INFINITY,
          },
        })
      },
    )

    // ========================================================
    // PILOT CCTV CAMERA - UNIT 03 HALL ENTRANCE
    // ========================================================

    viewer.entities.add({
      id: CAMERA_01.id,

      position: Cartesian3.fromDegrees(
        CAMERA_01.longitude,
        CAMERA_01.latitude,
        CAMERA_01.height,
      ),

      billboard: {
        image: CAMERA_ICON,
        width: 42,
        height: 42,
        verticalOrigin: VerticalOrigin.CENTER,
        horizontalOrigin: HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },

      label: {
        text: 'CAM 01',
        font: 'bold 12px Arial',
        fillColor: Color.fromCssColorString('#D9F7FF'),
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#071A2D').withAlpha(0.9),
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -27),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    // ========================================================
    // CLICK SITE / CAMERA ENTITY
    // ========================================================

    viewer
      .selectedEntityChanged
      .addEventListener(
        (entity) => {

          if (!entity) {
            return
          }

          if (entity.id === CAMERA_01.id) {
            setSelectedCamera(
              CAMERA_01,
            )

            setSelectedMachine(
              null,
            )

            setActiveSite(
              CAMERA_01.siteId,
            )

            return
          }

          const site =
            sites.find(
              (item) =>
                item.id ===
                entity.id,
            )

          if (!site) {
            return
          }

          setActiveSite(
            site.id,
          )

          setSelectedMachine(
            null,
          )

          setSelectedCamera(
            null,
          )

          flyCamera(
            viewer,
            site,
          )
        },
      )

    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {

      if (
        !machineClickHandler.isDestroyed()
      ) {
        machineClickHandler.destroy()
      }

      factoryModelRef.current =
        null

      machineModelsRef.current =
        []

      undergroundEntityIdsRef.current = {
        electrical: [],
        fiber: [],
        gas: [],
        sewer: [],
      }

      imageryLayersRef.current =
        {}

      if (
        !viewer.isDestroyed()
      ) {
        viewer.destroy()
      }

      viewerRef.current =
        null
    }

  }, [])

  // ==========================================================
  // UNDERGROUND NETWORK VISIBILITY
  // ==========================================================

  useEffect(
    () => {

      const viewer =
        viewerRef.current

      if (
        !viewer ||
        viewer.isDestroyed()
      ) {
        return
      }

      const visibilityMap:
        Record<
          UndergroundNetworkKey,
          boolean
        > = {
          electrical:
            electricalVisible,

          fiber:
            fiberVisible,

          gas:
            gasVisible,

          sewer:
            sewerVisible,
        }

      ;(
        Object.keys(
          visibilityMap,
        ) as UndergroundNetworkKey[]
      ).forEach(
        (networkKey) => {

          const visible =
            visibilityMap[
              networkKey
            ]

          undergroundVisibilityRef.current[
            networkKey
          ] =
            visible

          undergroundEntityIdsRef.current[
            networkKey
          ].forEach(
            (entityId) => {

              const entity =
                viewer.entities.getById(
                  entityId,
                )

              if (entity) {
                entity.show =
                  visible
              }
            },
          )
        },
      )
    },
    [
      electricalVisible,
      fiberVisible,
      gasVisible,
      sewerVisible,
    ],
  )

  // ==========================================================
  // UNDERGROUND MODE
  // ==========================================================

  useEffect(
    () => {

      const viewer =
        viewerRef.current

      if (
        !viewer ||
        viewer.isDestroyed()
      ) {
        return
      }

      viewer.scene.globe.translucency.enabled =
        undergroundMode

      viewer.scene.globe.translucency.frontFaceAlpha =
        undergroundMode
          ? 0.28
          : 1.0

      viewer.scene.globe.translucency.backFaceAlpha =
        undergroundMode
          ? 0.12
          : 1.0

      viewer.scene.screenSpaceCameraController.enableCollisionDetection =
        !undergroundMode

      Object.values(
        imageryLayersRef.current,
      ).forEach(
        (layer) => {
          if (layer) {
            layer.alpha =
              undergroundMode
                ? 0.42
                : 1.0
          }
        },
      )

      const surfaceAlpha =
        undergroundMode
          ? 0.24
          : 1.0

      const factoryModel =
        factoryModelRef.current

      if (
        factoryModel &&
        !factoryModel.isDestroyed()
      ) {
        factoryModel.color =
          Color.WHITE.withAlpha(
            surfaceAlpha,
          )
      }

      machineModelsRef.current.forEach(
        (model) => {

          if (
            !model.isDestroyed()
          ) {
            model.color =
              Color.WHITE.withAlpha(
                undergroundMode
                  ? 0.16
                  : 1.0,
              )
          }
        },
      )

      if (
        undergroundMode
      ) {
        flyUndergroundCamera(
          'oblique',
        )
      }
    },
    [undergroundMode],
  )

  // ==========================================================
  // BASEMAP SWITCH
  // ==========================================================

  const changeBaseMap = (
    map: BaseMapType,
  ) => {

    const layers =
      imageryLayersRef.current

    if (
      layers.eox
    ) {
      layers.eox.show =
        map === 'eox'
    }

    if (
      layers.osm
    ) {
      layers.osm.show =
        map === 'osm'
    }

    const offline =
      map === 'offline'

    if (
      layers.offlineIran
    ) {
      layers.offlineIran.show =
        offline
    }

    if (
      layers.offlineSaveh
    ) {
      layers.offlineSaveh.show =
        offline
    }

    if (
      layers.offlineTehran
    ) {
      layers.offlineTehran.show =
        offline
    }

    setBaseMap(
      map,
    )
  }

  // ==========================================================
  // CAMERA FLY
  // ==========================================================

  const flyCamera = (
    viewer: Viewer,
    site: Site,
  ) => {

    // --------------------------------------------------------
    // UNIT 03
    // --------------------------------------------------------

    if (
      site.id ===
      'UNIT_03'
    ) {

      viewer.camera.flyTo({

        destination:
          Cartesian3.fromDegrees(
            UNIT_02_03_CENTER.lon - 0.002,
            UNIT_02_03_CENTER.lat - 0.0045,
            500,
          ),

        orientation: {

          heading:
            CesiumMath.toRadians(
              25,
            ),

          pitch:
            CesiumMath.toRadians(
              -45,
            ),

          roll:
            0,
        },

        duration:
          5,
      })

      return
    }

    // --------------------------------------------------------
    // OTHER SITES
    // --------------------------------------------------------

    viewer.camera.flyTo({

      destination:
        Cartesian3.fromDegrees(
          site.lon,
          site.lat,
          2500,
        ),

      duration:
        4,
    })
  }

  // ==========================================================
  // FLY TO SITE
  // ==========================================================

  const flyToSite = (
    site: Site,
  ) => {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }

    setActiveSite(
      site.id,
    )

    setSelectedMachine(
      null,
    )

    flyCamera(
      viewer,
      site,
    )
  }

  // ==========================================================
  // HOME
  // ==========================================================

  const goHome =
    () => {

      const viewer =
        viewerRef.current

      if (!viewer) {
        return
      }

      setActiveSite(
        null,
      )

      setSelectedMachine(
        null,
      )

      viewer.camera.flyTo({

        destination:
          Cartesian3.fromDegrees(
            53.4,
            32.2,
            2600000,
          ),

        duration:
          4,
      })
    }

  // ==========================================================
  // SELECTED SITE
  // ==========================================================

  const selectedSite =
    sites.find(
      (site) =>
        site.id ===
        activeSite,
    )

  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="app">

      {/* MAP */}

      <div
        ref={
          cesiumContainer
        }
        className="cesium-container"
      />

      {/* TOP BAR */}

      <header className="topbar">

        <div className="brand">

          <strong className="brand-logo">
            NIKSUN
          </strong>

          <span className="brand-divider" />

          <span className="brand-title">
            Digital Twin Command Center
          </span>

        </div>

        <nav className="center-tabs">

          {
            sites.map(
              (site) => (

                <button
                  key={site.id}
                  type="button"
                  className={
                    activeSite === site.id
                      ? 'center-tab active'
                      : 'center-tab'
                  }
                  onClick={
                    () =>
                      flyToSite(
                        site,
                      )
                  }
                >
                  <span className="center-tab-icon">
                    â–¦
                  </span>

                  <span>
                    {
                      SITE_TAB_LABELS[site.id] ??
                      site.name
                    }
                  </span>
                </button>
              ),
            )
          }

        </nav>

        <div className="topbar-actions">

          <button
            type="button"
            className="home-button"
            onClick={goHome}
          >
            Ù†Ù…Ø§ÛŒ Ú©Ù„ÛŒ Ø§ÛŒØ±Ø§Ù†
          </button>

        </div>

      </header>

      {/* LAYERS */}

      <aside className="layers-panel">

        <div className="panel-header">

          <div className="panel-header-title">
            <span className="panel-header-icon">
              â—«
            </span>

            <span>
              Ù„Ø§ÛŒÙ‡â€ŒÙ‡Ø§
            </span>
          </div>

        </div>

        <div className="layer-section">

          <div className="layer-section-title">
            Ù†Ù‚Ø´Ù‡ Ù¾Ø§ÛŒÙ‡
          </div>

          <label className="layer-item">

            <span className="layer-name">
              Ù…Ø§Ù‡ÙˆØ§Ø±Ù‡â€ŒØ§ÛŒ Ø¢ÙÙ„Ø§ÛŒÙ†
            </span>

            <input
              type="radio"
              name="basemap"
              checked={
                baseMap === 'offline'
              }
              onChange={
                () =>
                  changeBaseMap(
                    'offline',
                  )
              }
            />

          </label>

          <label className="layer-item">

            <span className="layer-name">
              OpenStreetMap
            </span>

            <input
              type="radio"
              name="basemap"
              checked={
                baseMap === 'osm'
              }
              onChange={
                () =>
                  changeBaseMap(
                    'osm',
                  )
              }
            />

          </label>

          <label className="layer-item">

            <span className="layer-name">
              Ù…Ø§Ù‡ÙˆØ§Ø±Ù‡â€ŒØ§ÛŒ EOX
            </span>

            <input
              type="radio"
              name="basemap"
              checked={
                baseMap === 'eox'
              }
              onChange={
                () =>
                  changeBaseMap(
                    'eox',
                  )
              }
            />

          </label>

        </div>

        <div className="layer-divider" />

        <div className="layer-section">

          <div className="layer-section-title">
            Ù„Ø§ÛŒÙ‡â€ŒÙ‡Ø§ÛŒ Ø¹Ù…Ù„ÛŒØ§ØªÛŒ
          </div>

          <label className="layer-item">

            <span className="layer-name">
              Ù…Ø¬Ù…ÙˆØ¹Ù‡â€ŒÙ‡Ø§ÛŒ Ù†ÛŒÚ©Ø³Ø§Ù†
            </span>

            <input
              type="checkbox"
              defaultChecked
            />

          </label>

          <label className="layer-item">

            <span className="layer-name">
              Ù…Ø¯Ù„ Ø³Ù‡â€ŒØ¨Ø¹Ø¯ÛŒ Ú©Ø§Ø±Ø®Ø§Ù†Ù‡
            </span>

            <input
              type="checkbox"
              defaultChecked
            />

          </label>

          <div className="layer-item future-layer">

            <span className="layer-name">
              Ø³Ø§Ø®ØªÙ…Ø§Ù†â€ŒÙ‡Ø§
            </span>

            <span className="layer-coming">
              Ø¨Ù‡â€ŒØ²ÙˆØ¯ÛŒ
            </span>

          </div>

          <div className="layer-item future-layer">

            <span className="layer-name">
              Ø¯ÙˆØ±Ø¨ÛŒÙ†â€ŒÙ‡Ø§
            </span>

            <span className="layer-coming">
              Ø¨Ù‡â€ŒØ²ÙˆØ¯ÛŒ
            </span>

          </div>

        </div>

        <div className="layer-divider" />

        <div className="layer-section underground-section">

          <div className="layer-section-title underground-title">
            Ø´Ø¨Ú©Ù‡â€ŒÙ‡Ø§ÛŒ Ø²ÛŒØ±Ø²Ù…ÛŒÙ†ÛŒ
          </div>

          <button
            type="button"
            className={
              undergroundMode
                ? 'underground-mode-button active'
                : 'underground-mode-button'
            }
            onClick={
              toggleUndergroundMode
            }
          >
            <span className="underground-mode-icon">
              â—‰
            </span>

            <span className="underground-mode-copy">
              <strong>
                Underground Mode
              </strong>

              <small>
                Ù†Ù…Ø§ÛŒ Ø²ÛŒØ±Ø³Ø·Ø­ÛŒ Ú©Ø§Ø±Ø®Ø§Ù†Ù‡
              </small>
            </span>

            <span className="underground-mode-state">
              {
                undergroundMode
                  ? 'ON'
                  : 'OFF'
              }
            </span>
          </button>

          {
            undergroundMode && (

              <div className="underground-camera-presets">

                <div className="underground-camera-title">
                  Ø²Ø§ÙˆÛŒÙ‡ Ø¯ÛŒØ¯ Ø³Ø±ÛŒØ¹
                </div>

                <div className="underground-camera-buttons">

                  <button
                    type="button"
                    onClick={
                      () =>
                        flyUndergroundCamera(
                          'oblique',
                        )
                    }
                  >
                    <span>
                      â—©
                    </span>

                    Ù…ÙˆØ±Ø¨
                  </button>

                  <button
                    type="button"
                    onClick={
                      () =>
                        flyUndergroundCamera(
                          'top',
                        )
                    }
                  >
                    <span>
                      â—Ž
                    </span>

                    Ø¨Ø§Ù„Ø§
                  </button>

                  <button
                    type="button"
                    onClick={
                      () =>
                        flyUndergroundCamera(
                          'side',
                        )
                    }
                  >
                    <span>
                      â–¤
                    </span>

                    Ù…Ù‚Ø·Ø¹
                  </button>

                </div>

              </div>
            )
          }

          <label className="layer-item network-layer active-network">

            <span className="network-label">

              <span className="network-swatch electrical" />

              <span className="layer-name">
                Ø¨Ø±Ù‚
              </span>

              <span className="network-depth">
                -2 m
              </span>

            </span>

            <input
              type="checkbox"
              checked={
                electricalVisible
              }
              onChange={
                () =>
                  setNetworkVisibility(
                    'electrical',
                    !electricalVisible,
                  )
              }
            />

          </label>

          <label className="layer-item network-layer active-network">

            <span className="network-label">

              <span className="network-swatch fiber" />

              <span className="layer-name">
                ÙÛŒØ¨Ø± Ù†ÙˆØ±ÛŒ
              </span>

              <span className="network-depth">
                -6 m
              </span>

            </span>

            <input
              type="checkbox"
              checked={
                fiberVisible
              }
              onChange={
                () =>
                  setNetworkVisibility(
                    'fiber',
                    !fiberVisible,
                  )
              }
            />

          </label>

          <label className="layer-item network-layer active-network">

            <span className="network-label">

              <span className="network-swatch gas" />

              <span className="layer-name">
                Ú¯Ø§Ø²
              </span>

              <span className="network-depth">
                -12 m
              </span>

            </span>

            <input
              type="checkbox"
              checked={
                gasVisible
              }
              onChange={
                () =>
                  setNetworkVisibility(
                    'gas',
                    !gasVisible,
                  )
              }
            />

          </label>

          <label className="layer-item network-layer active-network">

            <span className="network-label">

              <span className="network-swatch sewer" />

              <span className="layer-name">
                ÙØ§Ø¶Ù„Ø§Ø¨
              </span>

              <span className="network-depth">
                -20 m
              </span>

            </span>

            <input
              type="checkbox"
              checked={
                sewerVisible
              }
              onChange={
                () =>
                  setNetworkVisibility(
                    'sewer',
                    !sewerVisible,
                  )
              }
            />

          </label>

          <div className="underground-depth-scale">

            <div className="depth-scale-title">
              Ù…Ù‚ÛŒØ§Ø³ Ø¹Ù…Ù‚ Ù†Ù…Ø§ÛŒØ´ÛŒ
            </div>

            <div className="depth-scale-track">

              <span className="depth-marker electrical">
                Ø¨Ø±Ù‚
              </span>

              <span className="depth-marker fiber">
                ÙÛŒØ¨Ø±
              </span>

              <span className="depth-marker gas">
                Ú¯Ø§Ø²
              </span>

              <span className="depth-marker sewer">
                ÙØ§Ø¶Ù„Ø§Ø¨
              </span>

            </div>

          </div>

          <div className="underground-note">
            Ø¹Ù…Ù‚â€ŒÙ‡Ø§ ÙØ¹Ù„Ø§Ù‹ Ø¨Ø±Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ ÙˆØ§Ø¶Ø­ Ø§Ø®ØªÙ„Ø§Ù ØªØ±Ø§Ø² Ø¨Ø²Ø±Ú¯â€ŒÙ†Ù…Ø§ÛŒÛŒ Ø´Ø¯Ù‡â€ŒØ§Ù†Ø¯Ø› Ø¨Ø¹Ø¯Ø§Ù‹ Ø¨Ø§ Depth ÙˆØ§Ù‚Ø¹ÛŒ PostGIS Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
          </div>

        </div>

      </aside>

      {/* ASSET INFORMATION */}

      <aside className="asset-panel">

        <div className="panel-header asset-header">

          <div className="panel-header-title">
            <span className="panel-header-icon">
              â—‰
            </span>

            <span>
              Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¯Ø§Ø±Ø§ÛŒÛŒ
            </span>
          </div>

          {
            (selectedMachine || selectedCamera) && (

              <button
                type="button"
                className="asset-close"
                onClick={
                  () => {
                    setSelectedMachine(
                      null,
                    )
                    setSelectedCamera(
                      null,
                    )
                  }
                }
                aria-label="Ø¨Ø³ØªÙ† Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¯Ø§Ø±Ø§ÛŒÛŒ"
              >
                Ã—
              </button>
            )
          }

        </div>

        {
          selectedCamera ? (

            <div className="asset-content camera-asset-content">

              <section className="asset-summary camera-summary">

                <div className="asset-thumbnail camera-thumbnail">
                  <span>
                    CAM
                  </span>
                </div>

                <div className="asset-summary-text">

                  <div className="asset-name">
                    {selectedCamera.name}
                  </div>

                  <div className="asset-model">
                    {selectedCamera.model}
                  </div>

                  <div className="asset-status-row">
                    <span className="status-dot camera-online-dot" />
                    <span className="status-pill">
                      LIVE / ONLINE
                    </span>
                  </div>

                </div>

              </section>

              <section className="asset-section camera-live-section">

                <div className="asset-section-title camera-live-title">
                  <span>Live View</span>
                  <span className="live-badge">LIVE</span>
                </div>

                <div className="camera-player-shell">
                  <iframe
                    className="camera-live-frame"
                    src={selectedCamera.streamUrl}
                    title={`Live View - ${selectedCamera.name}`}
                    allow="autoplay; fullscreen"
                  />
                </div>

                <div className="camera-stream-note">
                  WebRTC via MediaMTX Â· {selectedCamera.streamPath}
                </div>

              </section>

              <section className="asset-section">

                <div className="asset-section-title">
                  Ù…Ø´Ø®ØµØ§Øª Ø¯ÙˆØ±Ø¨ÛŒÙ†
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø³Ø§ÛŒØª
                  </span>
                  <strong>
                    {selectedCamera.siteName}
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ù…Ø­Ù„ Ù†ØµØ¨
                  </span>
                  <strong>
                    {selectedCamera.locationLabel}
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ù…Ø¯Ù„
                  </span>
                  <strong className="ltr-value">
                    {selectedCamera.model}
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    IP
                  </span>
                  <strong className="ltr-value">
                    {selectedCamera.ip}
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Stream
                  </span>
                  <strong className="ltr-value">
                    {selectedCamera.streamPath}
                  </strong>
                </div>

              </section>

              <section className="asset-section">

                <div className="asset-section-title">
                  Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø¹Ø±Ø¶ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ
                  </span>
                  <strong className="ltr-value">
                    {selectedCamera.latitude.toFixed(6)}
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø·ÙˆÙ„ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ
                  </span>
                  <strong className="ltr-value">
                    {selectedCamera.longitude.toFixed(6)}
                  </strong>
                </div>

              </section>

            </div>

          ) : selectedMachine ? (

            <div className="asset-content">

              <section className="asset-summary">

                <div className="asset-thumbnail">
                  <span>
                    EQ
                  </span>
                </div>

                <div className="asset-summary-text">

                  <div className="asset-name">
                    {
                      String(
                        selectedMachine.properties.name ??
                        `Ø¯Ø³ØªÚ¯Ø§Ù‡ ${selectedMachine.equipmentId}`,
                      )
                    }
                  </div>

                  <div className="asset-model">
                    {
                      String(
                        selectedMachine.properties.model ??
                        '-',
                      )
                    }
                  </div>

                  <div className="asset-status-row">

                    <span className="status-dot" />

                    <span className="status-pill">
                      {
                        String(
                          selectedMachine.properties.status ??
                          'Unknown',
                        )
                      }
                    </span>

                  </div>

                </div>

              </section>

              <section className="asset-section">

                <div className="asset-section-title">
                  Ù…Ø´Ø®ØµØ§Øª ØªØ¬Ù‡ÛŒØ²
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø´Ù†Ø§Ø³Ù‡
                  </span>

                  <strong>
                    {
                      selectedMachine.equipmentId
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ù†ÙˆØ¹ Ù…Ø¯Ù„
                  </span>

                  <strong>
                    {
                      selectedMachine.machineType
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ù…Ø¯Ù„
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.model ??
                        '-',
                      )
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    ØªÙ†Ø§Ú˜
                  </span>

                  <strong>
                    {
                      selectedMachine.properties.clamp_force_ton != null
                        ? `${selectedMachine.properties.clamp_force_ton} ØªÙ†`
                        : '-'
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø³Ø§Ø²Ù†Ø¯Ù‡
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.manufacturer ??
                        '-',
                      )
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø´Ù…Ø§Ø±Ù‡ Ø³Ø±ÛŒØ§Ù„
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.serial_number ??
                        '-',
                      )
                    }
                  </strong>
                </div>

              </section>

              <section className="asset-section">

                <div className="asset-section-title">
                  Ù…ÙˆÙ‚Ø¹ÛŒØª
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø³Ø§Ø®ØªÙ…Ø§Ù†
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.building_id ??
                        '-',
                      )
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ù†Ø§Ø­ÛŒÙ‡
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.area_id ??
                        '-',
                      )
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø¹Ø±Ø¶ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ
                  </span>

                  <strong className="ltr-value">
                    {
                      selectedMachine.latitude.toFixed(6)
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø·ÙˆÙ„ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ
                  </span>

                  <strong className="ltr-value">
                    {
                      selectedMachine.longitude.toFixed(6)
                    }
                  </strong>
                </div>

              </section>

              <section className="asset-section">

                <div className="asset-section-title">
                  Ù†Ú¯Ù‡Ø¯Ø§Ø±ÛŒ
                </div>

                <div className="asset-data-row">
                  <span>
                    ØªØ§Ø±ÛŒØ® Ù†ØµØ¨
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.installation_date ??
                        '-',
                      )
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø¢Ø®Ø±ÛŒÙ† Ø³Ø±ÙˆÛŒØ³
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.last_maintenance_date ??
                        '-',
                      )
                    }
                  </strong>
                </div>

                <div className="asset-data-row">
                  <span>
                    Ø³Ø±ÙˆÛŒØ³ Ø¨Ø¹Ø¯ÛŒ
                  </span>

                  <strong>
                    {
                      String(
                        selectedMachine.properties.next_maintenance_date ??
                        '-',
                      )
                    }
                  </strong>
                </div>

              </section>

            </div>

          ) : selectedSite ? (

            <div className="asset-empty">

              <div className="asset-empty-icon">
                â—Ž
              </div>

              <strong>
                {
                  selectedSite.name
                }
              </strong>

              <span>
                {
                  selectedSite.subtitle
                }
              </span>

              <div className="asset-empty-coordinates">
                {
                  selectedSite.lat.toFixed(6)
                }
                {' , '}
                {
                  selectedSite.lon.toFixed(6)
                }
              </div>

              <p>
                Ø¨Ø±Ø§ÛŒ Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ø§Ø·Ù„Ø§Ø¹Ø§Øª ØªØ¬Ù‡ÛŒØ²ØŒ Ø±ÙˆÛŒ ÛŒÚ©ÛŒ Ø§Ø² Ø¯Ø³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒ Ø³Ù‡â€ŒØ¨Ø¹Ø¯ÛŒ Ú©Ù„ÛŒÚ© Ú©Ù†ÛŒØ¯.
              </p>

            </div>

          ) : (

            <div className="asset-empty">

              <div className="asset-empty-icon">
                â—Ž
              </div>

              <strong>
                Ù‡ÛŒÚ† Ø¯Ø§Ø±Ø§ÛŒÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡
              </strong>

              <p>
                ÛŒÚ© ÙˆØ§Ø­Ø¯ ÛŒØ§ Ø¯Ø³ØªÚ¯Ø§Ù‡ Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯ ØªØ§ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¢Ù† Ø¯Ø± Ø§ÛŒÙ† Ù¾Ù†Ù„ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ø´ÙˆØ¯.
              </p>

            </div>
          )
        }

      </aside>

      {/* STATUS BAR */}

      <footer className="statusbar">

        <div className="status-item">
          <span className="status-indicator ready" />
          <span>
            Ù†Ù‚Ø´Ù‡ Ø¢ÙÙ„Ø§ÛŒÙ†:
          </span>
          <strong>
            Ø¢Ù…Ø§Ø¯Ù‡
          </strong>
        </div>

        <div className="status-item">
          <span className="status-indicator ready" />
          <span>
            WFS:
          </span>
          <strong>
            Ù…ØªØµÙ„
          </strong>
        </div>

        <div className="status-item">
          <span
            className={
              undergroundMode
                ? 'status-indicator underground-active'
                : 'status-indicator'
            }
          />

          <span>
            Underground:
          </span>

          <strong>
            {
              undergroundMode
                ? 'ÙØ¹Ø§Ù„'
                : 'Ø®Ø§Ù…ÙˆØ´'
            }
          </strong>
        </div>

        <div className="status-item status-coordinate-system">
          <span>
            Ø³ÛŒØ³ØªÙ… Ù…Ø®ØªØµØ§Øª:
          </span>
          <strong>
            WGS84 / UTM Zone 39N
          </strong>
        </div>

      </footer>

    </div>
  )
}

export default App
