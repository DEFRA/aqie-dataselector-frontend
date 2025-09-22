const SERVICE_NAME = 'Get air pollution data'
const problemtitle = 'There is a problem'
const trytitle = 'Try again later.'
const healtheff = 'Health effects'

export const english = {
  home: {
    pageTitle: SERVICE_NAME,
    heading: 'This is a private beta',
    subheading: ' Related content',
    buttonText: 'Start now',
    texts: {
      a: 'Use this service to:',
      b: 'find air quality monitoring stations',
      c: 'download air pollution data',
      d: 'This service uses data from the Automatic Urban and Rural network (AURN).',
      e: 'This service shows you data for:',
      p3: 'nitrogen dioxide',
      p2: 'PM10',
      p1: 'PM2.5',
      p4: 'ozone',
      p5: 'sulphur dioxide',
      f: 'You can',
      g: 'air quality in a local area, including the air pollution forecast for the next 5 days',
      h: 'health advice to reduce your exposure to pollutants',
      i: 'check air quality',
      j: 'to look up:'
    },
    links: {
      a: 'Check air quality',
      b: 'Health effects of air pollution',
      c: 'Air pollutants we measure',
      d: 'Why we monitor air pollution',
      e: 'Air quality alerts'
    }
  },
  login: {
    pageTitle: 'Sign in - Private beta air quality',
    heading: 'This is a private beta',
    texts: {
      a: 'You should only continue if you have been invited to.',
      b: 'Password',
      buttonText: 'Continue'
    }
  },
  checkLocalAirQuality: {
    pageTitle: 'Get air pollution data - GOV.UK',
    heading: SERVICE_NAME,
    page: SERVICE_NAME,
    paragraphs: {
      a: 'Use this service to:',
      b: 'check air quality in a local area',
      c: 'find information on air pollutants'
    },
    button: 'Start now'
  },
  searchLocation: {
    pageTitle: 'Find monitoring stations by location',
    heading: SERVICE_NAME,
    page: 'search-location',
    serviceName: SERVICE_NAME,

    searchParams: {
      text1: 'Find monitoring stations by location',
      text2:
        'For locations in Northern Ireland, you can only search by postcode.',
      text3: 'Enter a town or postcode',
      text4: 'Approximate search area',
      text5: '5 miles',
      text6: '25 miles',
      text7: '50 miles'
    },
    button: 'Continue',
    errorText: {
      radios: {
        title: problemtitle,
        list: {
          text: 'Select where you want to check'
        }
      },
      uk: {
        fields: {
          title: problemtitle,

          text: 'Enter a town or postcode'
        }
      },
      ni: {
        fields: {
          title: problemtitle,
          list: {
            text: 'Enter a postcode'
          }
        }
      }
    },
    errorText_sp: {
      uk: {
        fields: {
          title: problemtitle,

          text: 'Enter a town or postcode using only numbers and letters'
        }
      },
      ni: {
        fields: {
          title: problemtitle,
          list: {
            text: 'Enter a town or postcode using only numbers and letters'
          }
        }
      }
    }
  },
  notFoundLocation: {
    heading: SERVICE_NAME,
    paragraphs: {
      a: 'We could not find',
      b: 'If you searched for a place in England, Scotland or Wales, you should:',
      c: 'check the spelling',
      d: 'enter a broader location',
      e: 'enter a correct postcode',
      f: 'If you searched for a place in Northern Ireland, check that you have entered the correct postcode.',
      g: 'Go back to search a location'
    }
  },
  noStation: {
    heading: SERVICE_NAME,
    paragraphs: {
      a: 'There are no monitoring stations within',
      b: 'miles of',
      d: 'You should either:',
      e: 'choose a different search area',
      f: 'choose a different location',
      g: 'Go back to search a location'
    }
  },
  notFoundUrl: {
    heading: 'We could not find that page',
    paragraphs: {
      a: 'Go back to local air quality'
    }
  },
  multipleLocations: {
    pageTitle: 'Multiplelocations',
    title: 'Locations matching',
    serviceName: SERVICE_NAME,
    paragraphs: {
      a: 'More than one match was found for your location. Choose the correct location from the following options:',
      b: 'Alternatively,',
      c: 'try searching again'
    }
  },
  monitoringStation: {
    pageTitle: 'Monitoring stations',
    title: {
      title1: 'Monitoring stations',
      title2: 'within ',
      title3: 'of'
    },

    serviceName: SERVICE_NAME,
    paragraphs: {
      a: 'Change search area',
      b: 'Monitoring station',
      c: 'Site type',
      d: 'Pollutants'
    }
  },
  stationdetails: {
    pageTitle: 'Stations summary details',
    title: {
      title1: 'Stations summary details',
      title2: 'within ',
      title3: 'of'
    },
    maptoggletips: {
      Urban_traffic:
        'This monitoring site is in a city or town close to roads, motorways or highways. ',
      Urban_industrial:
        'This monitoring site is in a city or town, downwind of an industrial source. ',
      Suburban_industrial:
        'This monitoring site is on the outskirts of an urban area (or in an area of its own), downwind of an industrial source.',
      Suburban_background:
        'This monitoring site is on the outskirts of an urban area or in an area of its own. It is located so pollutant measurements do not come from one specific source. ',
      Rural_background:
        'This monitoring area is in small settlements or areas with natural ecosystems, forests or crops. It is located so pollutant measurements do not come from one specific source.',
      Urban_background:
        'This monitoring area is in a city or town. It is located so pollutant measurements do not come from one specific source. '
    },

    serviceName: SERVICE_NAME,
    paragraphs: {
      a: 'Change search area',
      b: 'Monitoring station',
      c: 'Site type',
      d: 'Pollutants'
    }
  },
  phaseBanner: {
    paragraphs: {
      a: 'Beta',
      b: 'Give your',
      c: 'feedback',
      d: 'on this new service'
    }
  },
  backlink: {
    text: 'Change location'
  },
  cookieBanner: {
    title: 'Cookies on Get air pollution data',
    paragraphs: {
      a: 'We use some essential cookies to make this service work.',
      b: "We'd also like to use analytics cookies so we can understand how you use the service and make improvements."
    },
    buttons: {
      a: 'Accept analytics cookies',
      b: 'Reject analytics cookies',
      c: 'View cookies'
    },
    hideCookieMsg: {
      text0: 'You’ve accepted analytics cookies. You can ',
      text1: 'You’ve rejected analytics cookies. You can',
      text2: 'change your cookie settings',
      text3: ' at any time.',
      buttonText: 'Hide cookie message'
    }
  },
  errorpages: {
    title: 'Cookies on Get air pollution data',
    texts_404: {
      a: 'Page not found',
      b: 'If you typed the web address, check it is correct.',
      c: 'If you pasted the web address, check you copied the entire address. ',
      d: 'Contact the ',
      e: 'air quality team ',
      f: 'if you continue to get this error message'
    },
    texts_401: {
      a: 'Unauthorised access',
      b: trytitle,
      c: 'You can go to ',
      d: 'UK AIR',
      e: 'to get air pollution data.'
    },
    texts_403: {
      a: 'Forbidden',
      b: trytitle,
      d: 'UK AIR'
    },
    texts_500: {
      a: 'Sorry, there is a problem with the service',
      b: trytitle,
      d: 'UK AIR'
    }
  },
  footerTxt: {
    cookies: 'Cookies',
    privacy: 'Privacy',
    accessibility: 'Accessibility statement',
    paragraphs: {
      a: 'All content is available under the',
      b: 'Open Government Licence v3.0, ',
      c: 'except where otherwise stated',
      d: 'Crown copyright'
    }
  },
  daqi: {
    paragraphs: {
      a: 'The air pollution forecast for today is',
      b: 'out of 10'
    },
    caption:
      'The daily air quality index (DAQI) tells you about levels of air pollution. It provides health advice for current levels.',
    summaryText: 'How different levels of air pollution can affect health',
    headText: {
      a: 'Level',
      b: 'Index',
      c: 'Health advice'
    },
    healthAdvice: {
      paragraphs: {
        a: 'Health advice for',
        b: 'levels of air pollution'
      }
    },
    pageTexts: {
      a: 'UK air pollution summary',
      b: 'Latest at 5am on',
      c: 'How air pollutants can affect your health',
      d: 'Air pollutants monitored near by'
    },
    pollutantText: {
      a: 'Gases',
      b: 'Produced by burning fossil fuels. For example, in cars, power stations and factories.',
      c: 'Particulate matter are tiny pieces of solid or liquid particles suspended in the air. They come from sources like car tyres, brakes, exhausts, dust, wood burning and pollen.',
      d: 'Particulate matter (PM)'
    },
    pollutantsNames: {
      a: 'Ozone',
      b: 'Nitrogen dioxide',
      c: 'Sulphur dioxide',
      d: 'PM2.5',
      e: 'PM10'
    },
    pollutantTable: {
      a: 'miles away',
      b: 'Pollutants',
      c: 'Latest',
      d: 'Level',
      e: 'Low range',
      f: 'Latest measurement at',
      g: 'on'
    },
    levels: {
      a: 'Low',
      b: 'Moderate',
      c: 'High',
      d: 'Very high'
    },
    tooltipText: {
      level:
        'There are 4 levels: low, moderate, high and very high. The level is determined by the highest reading of a single pollutant.',
      latest:
        'Readings are measured every hour. The unit µg/&#13221; stands for micrograms (one millionth of a gram) per cubic metre of air.'
    }
  },
  pollutants: {
    ozone: {
      title: 'Ozone (O₃)',
      pageTitle: 'Ozone(O₃) – Get air pollution data – GOV.UK',
      headerText: SERVICE_NAME,
      headings: {
        a: 'Sources of ozone',
        b: healtheff
      },
      paragraphs: {
        a: 'There are no major emission sources of ozone itself. Reactions between other pollutants form ozone in the air. For example, when pollutants from cars, power stations and factories react with sunlight.',
        b: 'Ground level ozone can be at unhealthy levels on both hot and cold days. It can travel by the wind, affecting both urban and rural areas.',
        c: 'Short term exposure to ozone can cause:',
        d: 'shortness of breath, wheezing and coughing',
        e: 'asthma attacks',
        f: 'increased risk of respiratory infections',
        g: 'irritation of eyes, nose and throat',
        h: 'Long term exposure to ozone may lead to:',
        i: 'increased respiratory illnesses',
        j: 'nervous system issues',
        k: 'cancer',
        l: 'heart issues'
      }
    },
    nitrogenDioxide: {
      title: 'Nitrogen dioxide (NO₂)',
      pageTitle: 'Nitrogen dioxide (NO₂) – Get air pollution data – GOV.UK',
      headerText: SERVICE_NAME,
      headings: {
        a: 'Sources of nitrogen dioxide',
        b: healtheff
      },
      paragraphs: {
        a: 'Nitrogen dioxide is a colourless gas. It’s mainly produced during:',
        b: 'burning of petrol or diesel in a car engine',
        c: 'burning natural gas in a central-heating boiler or power station',
        d: 'welding',
        e: 'the use of explosives',
        f: 'commercial manufacturing',
        g: 'food manufacturing',
        h: 'Short term exposure to nitrogen dioxide can cause:',
        i: 'asthma attacks',
        j: 'respiratory infections',
        k: 'symptoms of lung or heart conditions to get worse',
        l: 'Long term exposure to nitrogen dioxide can cause:',
        m: 'an increase risk of respiratory infections',
        n: 'poorer lung function in children'
      }
    },
    sulphurDioxide: {
      title: 'Sulphur dioxide (SO₂)',
      pageTitle: 'Sulphur dioxide (NO₂) – Get air pollution data – GOV.UK',
      headerText: SERVICE_NAME,
      headings: {
        a: 'Sources of sulphur dioxide',
        b: healtheff
      },
      paragraphs: {
        a: 'Sulphur dioxide is a colourless gas with a strong odour. It’s mainly produced from:',
        b: 'burning petrol or diesel in vehicles',
        c: 'gas boilers',
        d: 'coal burning power stations',
        e: 'commercial manufacturing',
        f: 'food manufacturing',
        g: 'Short term exposure can cause irritation to the:',
        h: 'eyes',
        i: 'nose',
        j: 'throat',
        k: 'Long term exposure at high levels may lead to:',
        l: 'reduced lung function',
        m: 'altered sense of smell',
        n: 'increased respiratory infections'
      }
    },
    particulateMatter10: {
      title: 'Particulate matter (PM10)',
      pageTitle: 'Particulate matter (PM10) – Get air pollution data – GOV.UK',
      headerText: SERVICE_NAME,
      headings: {
        a: 'Sources of PM10',
        b: healtheff
      },
      paragraphs: {
        a: 'Particulate matter (PM) are small particles of solids or liquids that are in the air. The particles are only 10 micrometres in diameter. For context, the width of a human hair is 50 to 70 micrometres.',
        b: 'The main sources of particulate matter are:',
        c: 'dust from construction sites',
        d: 'dust from landfills',
        e: 'dust from agriculture',
        f: 'wildfires',
        g: 'pollen',
        h: 'power stations',
        i: 'vehicles',
        j: 'Short term health impacts of PM10 can include:',
        k: 'difficulty breathing',
        l: 'coughing',
        m: 'eye, nose and throat irritation',
        n: 'chest tightness and pain',
        o: 'Long term health impacts of PM10 can include:',
        p: 'lung tissue damage',
        q: 'asthma',
        r: 'heart failure',
        s: 'cancer',
        t: 'chronic obstructive pulmonary disease (COPD)'
      }
    },
    particulateMatter25: {
      title: 'Particulate matter (PM2.5)',
      pageTitle: 'Particulate matter (PM2.5) – Get air pollution data – GOV.UK',
      headerText: SERVICE_NAME,
      headings: {
        a: 'Sources of PM2.5',
        b: healtheff
      },
      paragraphs: {
        a: 'Particulate matter (PM) are small particles of solids or liquids that are in the air. The particles are only 2.5 micrometres in diameter. For context, the width of a human hair is 50 to 70 micrometres.',
        b: 'PM2.5 particles may include:',
        c: 'dust',
        d: 'soot',
        e: 'smoke',
        f: 'drops of liquid',
        g: 'The main sources of particulate matter are from:',
        h: 'burning of fuel by vehicles, industry and domestic properties',
        i: 'wear of tyres and brakes',
        j: 'wind blown soil and dust',
        k: 'sea spray particles',
        l: 'burning vegetation',
        m: 'Short term health impacts of PM2.5 can include worsening of conditions such as:',
        n: 'asthma',
        o: 'chronic obstructive pulmonary disease (COPD)',
        p: 'Long term health impacts of PM2.5 can include:',
        q: 'strokes',
        r: 'lung cancer',
        s: 'diabetes',
        t: 'Alzheimer’s and Parkinson’s disease',
        u: 'poor lung health in children'
      }
    }
  },
  footer: {
    privacy: {
      pageTitle: 'Privacy - ' + SERVICE_NAME,
      title: 'Privacy notice',
      heading: SERVICE_NAME,
      headings: {
        a: 'Who collects your personal data',
        b: 'What personal data we collect and how it’s used',
        c: 'Lawful basis for processing your personal data',
        d: 'Consent to process your personal data',
        e: 'Who we share your personal data with',
        f: 'How long we keep personal data',
        g: 'What happens if you do not provide personal data',
        h: 'Use of automated decision-making or profiling',
        i: 'Transfer of your personal data outside the UK',
        j: 'Your rights',
        k: 'Complaints',
        l: 'Personal information charter'
      },
      paragraphs: {
        a: 'This privacy notice explains how the',
        link1: SERVICE_NAME,
        a29: 'website processes and shares your personal data. If you have any queries about the content of this privacy notice, email ',
        b: 'Department for Environment, Food and Rural Affairs (Defra) is the controller for the personal data we collect:',
        c: ' Department for Environment, Food and Rural Affairs',
        d: '    Seacole Building',
        e: '    2 Marsham Street',
        f: '    London',
        g: '    SW1P 4DF',
        h: 'If you need further information about how Defra uses your personal data and your associated rights you can contact the Defra data protection manager at ',
        i: 'or at the above address.',
        j: 'The data protection officer for Defra is responsible for checking that Defra complies with legislation. You can contact them by email or post.',
        j1: ' or at the above postal address.',
        k: 'We collect the postcode or placename you search for so that the website will work.',
        l: 'the postcode or placename that you search for as this is essential data for the service to give relevant data',
        m: 'your IP address so that we can collect your location information - this will help us see what geographical locations our users are in',
        n: 'data on your device and operating system - to help us improve our website',
        o: "the pages you interact with in the 'get air pollution data' website - to help us improve it",
        p: "the pages you interact with in 'Get air pollution data' to enable us to improve our service",
        q: 'The lawful basis for processing your personal data to conduct research on the effectiveness of this website is ‘consent’. You do not have to provide your consent, and you can withdraw it at any time.',
        r: 'Processing your personal data is based on consent. We do not collect any information that could be personally linked to an individual. However, we need to record your IP address for the website to work.',
        s: 'We do not share the personal data we collect under this privacy notice with other organisations.',
        t: 'We respect your personal privacy when we respond to ‘access to information’ requests. We only share information when necessary to meet the statutory requirements of the Environmental Information Regulations 2004 and the Freedom of Information Act 2000.',
        u: 'We keep your personal data for 7 years in line with legal requirements.',
        w: 'for advice on retention period that you need to state here.',
        x: 'If you do not provide the postcode or location you are searching for, we will not be able to give you air pollution data.',
        y: 'Providing other personal data is optional. We only collect it to help us improve our website.',
        z: 'The personal data you provide is not used for:',
        a0: 'automated decision-making (making a decision by automated means without any human involvement)',
        a1: 'profiling (automated processing of personal data to evaluate certain things about an individual)',
        a2: 'We will only transfer your personal data to a country that is deemed adequate for data protection purposes.',
        a3: 'Based on lawful processing, your individual rights are:',
        a4: 'consent',
        a5: 'the right to be informed',
        a6: 'the right of access',
        a7: 'the right to rectification',
        a8: 'the right to erasure',
        a9: 'the right to restrict processing',
        a10: 'the right to data portability',
        a11: 'rights in relation to automated decision-making and profiling',
        a12: 'Find more information about your rights under the UK General Data Protection Regulation and the Data Protection Act 2018 at the ',
        a13: 'individual rights',
        a14: 'under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018 (DPA 2018),',
        a15: 'Information Commissioner’s Office.',
        a16: 'You have the right to',
        a17: 'make a complaint',
        a18: 'to the Information Commissioner’s Office at any time.',
        a19: 'Personal information charter',
        a20: 'Our',
        a21: 'personal information charter',
        a22: 'explains more about your rights over your personal data.',
        a23: 'If you accept Google Analytics cookies, we will collect:',
        a24: 'You can ',
        a25: 'opt in and out of cookies.',
        r2: 'If you accept cookies, any information that we collect cannot be removed. This is because we will not be able to identify that information to a specific individual.',
        a27: "the search term you used to find the 'get air pollution data' website - to help us improve it",
        a28: 'opt in and out of cookies.',
        b1: 'The Department for Environment, Food and Rural Affairs (Defra) is the controller for the personal data we collect.',
        b2: 'For more information about how Defra uses your personal data and your associated rights, contact the Defra data protection manager by email or post.',
        b3: 'Email:',
        b4: 'Post:'
      }
    },
    cookies: {
      title: 'Cookies',
      pageTitle: 'Cookies - ' + SERVICE_NAME,
      headings: {
        a: 'Essential cookies (strictly necessary)',
        b: 'Analytics cookies (optional)',
        c: 'Analytics cookies we use',
        d: 'Do you want to accept analytics cookies?'
      },
      table1: {
        title: 'Essential cookies we use',
        text1: 'Name',
        text2: 'Purpose',
        text3: 'Expires',
        text4: 'airaqie_cookies_analytics',
        text5: 'Saves your cookie consent settings',
        text6: '1 year'
      },
      table2: {
        text1: 'Name',
        text2: 'Purpose',
        text3: 'Expires',
        text4:
          "Helps us count how many people visit 'get air pollution data' by telling us if you’ve visited before",
        text5: '2 years',
        text6: '_gid',
        text7:
          'Helps us count how many people visit the Get air pollution data by telling us if you’ve visited before',
        text8: '24 hours',
        text9: 'Used to reduce the number of requests',
        text10: '1 minute',
        text11:
          "Application related data is managed in this cookie. It's required for the application to work",
        text12: '30 minutes'
      },
      paragraphs: {
        w1: '',
        a: SERVICE_NAME,
        b: 'puts small files (known as ‘cookies’) on your computer.',
        c: "These cookies are used across the 'get air pollution data' service.",
        d: 'We only set cookies when Javascript is running in your browser and you have accepted them. If you choose not to run Javascript, the information on this page will not apply to you.',
        e: 'Find out',
        f: 'how to manage cookies',
        g: 'from the Information Commissioner‘s Office.',
        h: 'We use an essential cookie to remember when you accept or reject cookies on our website.',
        i: 'We use Google Analytics software to understand how people use the Get air pollution data. We do this to help make sure the site is meeting the needs of its users and to help us make improvements.',
        j: 'We do not collect or store your personal information (for example your name or address) so this information cannot be used to identify who you are.',
        k: 'We do not allow Google to use or share our analytics data.',
        l: 'Google Analytics stores information about:',
        m: 'the pages you visit',
        n: 'how long you spend on each page',
        o: 'how you arrived at the site',
        p: 'what you click on while you visit the site',
        q: 'the device and browser you use',
        r: 'Yes',
        s: 'No',
        u: 'The cookies _ga_ and _gat_UA-[G-V4MBMR0QPC] will only be active if you accept cookies. If you do not accept cookies, they may still appear in your cookie session, but they will not be active.',
        v: "We use Google Analytics software to understand how people use the 'get air pollution data' service. We do this to: ",
        v1: 'help make sure the site is meeting the needs of its users',
        v2: 'help us make improvements',
        w: 'We do not collect or store your personal information (for example your name or address) so this information cannot be used to identify who you are.',
        x: 'We do not allow Google to use or share our analytics data.',
        y: 'Google Analytics stores information about:',
        z1: 'the pages you visit',
        z2: 'how long you spend on each page',
        z3: 'how you arrived at the site',
        z4: 'what you click on while you visit the site',
        z5: 'the device and browser you use',
        buttonText: 'Save cookie settings'
      }
    },
    accessibility: {
      title: 'Accessibility statement',
      pageTitle: 'Accessibility statement - ' + SERVICE_NAME,
      headings: {
        a: 'Compliance status',
        b: 'Preparation of this accessibility statement',
        c: 'Feedback and contact information',
        d: 'Enforcement procedure'
      },
      paragraphs: {
        a: 'The Department for Environment, Food and Rural Affairs is committed to making its websites accessible in accordance with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018.',
        b: 'This accessibility statement applies to the',
        c: 'This website complies with the Web Content Accessibility Guidelines (WCAG) version 2.2 AA standard.',
        d: 'service was evaluated for accessibility by Defra. ',
        e: 'This statement was prepared on 8 January 2025. It was last reviewed on 19 August 2025.',
        f: 'This website was last tested on 5 June 2025. The test was carried out by the Digital Accessibility Centre.',
        g: 'If you notice any compliance failures or need to request information and content that is not provided in this document, email',
        h: 'The Equality and Human Rights Commission is responsible for enforcing the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018.',
        i: 'If you are not happy with how Defra responds to your complaint, contact the',
        i1: 'Equality Advisory and Support Service (EASS).'
      }
    }
  }
}

export const calendarEnglish = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]
