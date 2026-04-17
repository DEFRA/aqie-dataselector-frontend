/**
 * Network metadata map keyed by abbreviation.
 * Use networkData['BCN'] to get full details for the Black Carbon Network.
 */
export const networkData = {
  // ── Near real-time data from Defra ──────────────────────────────────────
  AURN: {
    abbreviation: 'AURN',
    name: 'Automatic Urban and Rural Network (AURN)',
    fullName: 'Automatic Urban and Rural Network (AURN)',
    category: 'Near real-time data from Defra',
    description:
      'UK national automatic network for regulatory and public reporting.',
    pollutants: [
      'fine particulate matter (PM2.5)',
      'particulate matter (PM10)',
      'nitrogen dioxide (NO2)',
      'nitrogen oxides (NOx)',
      'ozone (O3)',
      'sulphur dioxide (SO2)',
      'carbon monoxide (CO)'
    ],
    startDate: '1972',
    timeResolution: 'Hourly',
    published: 'Provisional hourly; ratified after QA/QC',
    instrument:
      'Chemiluminescence (NOx), UV photometry (O3), UV fluorescence (SO2), NDIR (CO), TEOM-FDMS/BAM and gravimetric (PM)',
    moreInfoText:
      'More information about the Automatic Urban and Rural Network (AURN)'
  },

  AHC: {
    abbreviation: 'AHC',
    name: 'Automatic Hydrocarbon Network',
    fullName: 'Automatic Hydrocarbon Network (AHC)',
    category: 'Near real-time data from Defra',
    description: 'Hourly speciated volatile organic compounds (VOCs).',
    pollutants: [
      'benzene (C6H6)',
      '1,3-butadiene (C4H6)',
      'toluene (C7H8)',
      'ethylbenzene (C8H10)',
      'm+p-xylene (C8H10)',
      'o-xylene (C8H10)',
      'isoprene (C5H8)'
    ],
    startDate: '1992',
    timeResolution: 'Hourly',
    published: 'Hourly (provisional); ratified later',
    instrument: 'Automatic gas chromatographs',
    moreInfoText:
      'More information about the Automatic Hydrocarbon Network (AHC)'
  },

  // ── Other data from Defra ────────────────────────────────────────────────
  AGANet: {
    abbreviation: 'AGANet',
    name: 'UKEAP: Acid Gas and Aerosol Network',
    fullName: 'UKEAP: Acid Gas and Aerosol Network (AGANet)',
    category: 'Other data from Defra',
    description: 'Acid gases and aerosol ions (monthly).',
    pollutants: [
      'nitric acid (HNO3)',
      'hydrochloric acid (HCl)',
      'ammonia (NH3)',
      'ammonium (NH4)',
      'nitrate (NO3)',
      'sulphate (SO4)',
      'chloride (Cl)'
    ],
    startDate: '1980',
    timeResolution: 'Monthly',
    published: 'After laboratory analysis',
    instrument: 'DELTA denuder system',
    moreInfoText:
      'More information about the UKEAP: Acid Gas and Aerosol Network (AGANet)'
  },

  NAMN: {
    abbreviation: 'NAMN',
    name: 'UKEAP: National Ammonia Monitoring Network',
    fullName: 'UKEAP: National Ammonia Monitoring Network (NAMN)',
    category: 'Other data from Defra',
    description: 'National ammonia and ammonium monitoring.',
    pollutants: ['ammonia (NH3)', 'ammonium (NH4)'],
    startDate: '1980',
    timeResolution: 'Monthly',
    published: 'After laboratory analysis',
    instrument: 'ALPHA passive tubes; DELTA denuder at some sites',
    moreInfoText:
      'More information about the UKEAP: National Ammonia Monitoring Network (NAMN)'
  },

  MARGA: {
    abbreviation: 'MARGA',
    name: 'UKEAP - MARGA  Network (MARGA)',
    fullName: 'UKEAP: MARGA Network (MARGA)',
    category: 'Other data from Defra',
    description: 'Hourly inorganic ions and related gases at background sites.',
    pollutants: [
      'ammonium (NH4)',
      'nitrate (NO3)',
      'sulphate (SO4)',
      'chloride (Cl)',
      'sodium (Na)',
      'potassium (K)',
      'calcium (Ca)',
      'magnesium (Mg)',
      'nitric acid (HNO3)',
      'ammonia (NH3)'
    ],
    startDate: '1980',
    timeResolution: 'Hourly',
    published: 'Hourly series; summaries in UKEAP reports',
    instrument: 'MARGA analyser (ion chromatography)',
    moreInfoText: 'More information about the UKEAP: MARGA Network (MARGA)'
  },

  RMN: {
    abbreviation: 'RMN',
    name: 'UKEAP: Rural Mercury Network',
    fullName: 'UKEAP: Rural Mercury Network (RMN)',
    category: 'Other data from Defra',
    description: 'Speciated atmospheric mercury at rural sites.',
    pollutants: [
      'gaseous elemental mercury (Hg0, GEM)',
      'particulate-bound mercury (PBM)',
      'reactive oxidised mercury (GOM)'
    ],
    startDate: '1980',
    timeResolution: 'GEM typically hourly; PBM/GOM periodic',
    published: 'Periodic uploads',
    instrument: 'Tekran 2537x with 1130/1135 speciation',
    moreInfoText:
      'More information about the UKEAP: Rural Mercury Network (RMN)'
  },

  'Precip-Net': {
    abbreviation: 'Precip-Net',
    name: 'UKEAP: Precipitation Chemistry Network',
    fullName: 'UKEAP: Precipitation Chemistry Network (Precip-Net)',
    category: 'Other data from Defra',
    description: 'Precipitation chemistry (major ions).',
    pollutants: [
      'sulphate (SO4)',
      'nitrate (NO3)',
      'chloride (Cl)',
      'sodium (Na)',
      'potassium (K)',
      'calcium (Ca)',
      'magnesium (Mg)'
    ],
    startDate: '1986',
    timeResolution: 'Weekly to fortnightly sampling',
    published: 'After laboratory analysis',
    instrument: 'Bulk collectors; wet-only collectors at supersites',
    moreInfoText:
      'More information about the UKEAP: Precipitation Chemistry Network (Precip-Net)'
  },

  PAH: {
    abbreviation: 'PAH',
    name: 'PAH Network',
    fullName: 'PAH Network (PAH)',
    category: 'Other data from Defra',
    description: 'Non-automatic PAHs with laboratory analysis.',
    pollutants: [
      'polycyclic aromatic hydrocarbons (PAHs)',
      'benzo[a]pyrene (BaP)'
    ],
    startDate: '1991',
    timeResolution: 'Period sampling',
    published: 'After laboratory analysis',
    instrument: 'Filters/adsorbents; GC-MS',
    moreInfoText: 'More information about the PAH Network (PAH)'
  },

  TOMPs: {
    abbreviation: 'TOMPs',
    name: 'Toxic Organic Micro-Pollutants Network',
    fullName: 'Toxic Organic Micro-Pollutants (TOMPs) Network',
    category: 'Other data from Defra',
    description: 'Semi-volatile organic pollutants.',
    pollutants: [
      'polychlorinated biphenyls (PCBs)',
      'selected pesticides',
      'other semi-volatile organic compounds (SVOCs)'
    ],
    startDate: '1991',
    timeResolution: 'Period sampling',
    published: 'After laboratory analysis',
    instrument: 'Hi-vol/PUF; GC-MS',
    moreInfoText:
      'More information about the Toxic Organic Micro-Pollutants (TOMPs) Network'
  },

  NAHC: {
    abbreviation: 'NAHC',
    name: 'Non-Automatic Hydrocarbon Network',
    fullName: 'Non-Automatic Hydrocarbon Network (NAHC)',
    category: 'Other data from Defra',
    description: 'Fortnightly pumped tubes for benzene.',
    pollutants: ['benzene (C6H6)', '1,3-butadiene (C4H6) — historically'],
    startDate: '2001',
    timeResolution: 'Fortnightly',
    published: 'After laboratory analysis',
    instrument: 'Pumped sorbent tubes (Carbopack X); GC-FID',
    moreInfoText:
      'More information about the Non-Automatic Hydrocarbon Network (NAHC)'
  },

  PCN: {
    abbreviation: 'PCN',
    name: 'Particle Concentrations and Numbers Network',
    fullName: 'Particle Concentrations and Numbers Network (PCN)',
    category: 'Other data from Defra',
    description: 'Particle numbers, size distributions and carbon fractions.',
    pollutants: [
      'particle number concentration',
      'size distribution',
      'organic carbon (OC)',
      'elemental carbon (EC)',
      'elemental composition'
    ],
    startDate: '2001',
    timeResolution: 'Instrument-dependent (many hourly/continuous)',
    published: 'Periodic uploads',
    instrument: 'SMPS, CPC, EC/OC, XRF, ACSM; Digitel PM2.5',
    moreInfoText:
      'More information about the Particle Concentrations and Numbers Network (PCN)'
  },

  HMN: {
    abbreviation: 'HMN',
    name: 'Heavy Metals Network',
    fullName: 'Heavy Metals Network (HMN)',
    category: 'Other data from Defra',
    description:
      'Monthly metals in airborne particulate matter at urban and industrial sites.',
    pollutants: [
      'arsenic (As)',
      'cadmium (Cd)',
      'chromium (Cr)',
      'cobalt (Co)',
      'copper (Cu)',
      'iron (Fe)',
      'lead (Pb)',
      'manganese (Mn)',
      'nickel (Ni)',
      'selenium (Se)',
      'vanadium (V)',
      'zinc (Zn)'
    ],
    startDate: '2003',
    timeResolution: 'Monthly',
    published: 'After laboratory analysis',
    instrument: 'Filter sampling; ICP-MS/XRF analysis',
    moreInfoText: 'More information about the Heavy Metals Network'
  },

  BCN: {
    abbreviation: 'BCN',
    name: 'Black Carbon Network',
    fullName: 'Black Carbon Network (BCN)',
    category: 'Other data from Defra',
    description: 'Black carbon and UV-absorbing PM.',
    pollutants: ['black carbon (BC)', 'UVPM'],
    startDate: '2006',
    timeResolution: 'Hourly (typical)',
    published: 'Periodic uploads',
    instrument: 'Aethalometers (e.g. Magee AE22/AE33)',
    moreInfoText: 'More information about the Black Carbon Network (BCN)'
  },

  'Rural NO2': {
    abbreviation: 'Rural NO2',
    name: 'UKEAP - Rural NO2 Network',
    fullName: 'UKEAP: Rural NO2 Network (Rural NO2)',
    category: 'Other data from Defra',
    description: 'Rural/background nitrogen dioxide using diffusion tubes.',
    pollutants: ['nitrogen dioxide (NO2)'],
    startDate: '1980',
    timeResolution: '4-weekly exposure',
    published: 'After laboratory analysis',
    instrument: 'Palmes-type open diffusion tubes',
    moreInfoText:
      'More information about the UKEAP: Rural NO2 Network (Rural NO2)'
  },

  UUNN: {
    abbreviation: 'UUNN',
    name: 'UK Urban NO2 Network',
    fullName: 'UK Urban NO2 Network (UUNN)',
    category: 'Other data from Defra',
    description: 'Diffusion-tube NO2 at urban traffic sites.',
    pollutants: ['nitrogen dioxide (NO2)'],
    startDate: '2020',
    timeResolution: '4-weekly exposure',
    published: 'After laboratory analysis',
    instrument: 'Triplicate diffusion tubes with wind caps',
    moreInfoText: 'More information about the UK Urban NO2 Network (UUNN)'
  },

  // ── Non-Defra data ───────────────────────────────────────────────────────
  'Local-Auto': {
    abbreviation: 'Local-Auto',
    name: 'Locally-managed automatic monitoring',
    fullName: 'Locally-managed automatic monitoring',
    category: 'Non-Defra data',
    description:
      'This data is measured at air pollution hot spots across the UK. It mostly comes from local authority monitoring stations. This data is usually published every hour (near real-time). It varies in quality.',
    pollutants: [
      'fine particulate matter (PM2.5)',
      'particulate matter (PM10)',
      'nitrogen dioxide (NO2)',
      'nitrogen oxides (NOx)',
      'ozone (O3)',
      'sulphur dioxide (SO2)',
      'carbon monoxide (CO)'
    ],
    startDate: '1973',
    timeResolution: 'Typically hourly',
    published: 'Varies by provider',
    instrument: 'Continuous analysers; BAM/FDMS for PM',
    moreInfoText: 'More information about locally-managed automatic monitoring'
  }
}
