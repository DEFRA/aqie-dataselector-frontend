const SERVICE_NAME = 'Get air pollution data'
const problemtitle = 'There is a problem'
export const englishNew = {
  home: {
    pageTitle: SERVICE_NAME,
    heading: 'This is a private beta',
    subheading: ' Related content',
    buttonText: 'Start now',
    texts: {
      a: 'Use this service to view and download air pollution data from monitoring networks across the UK.',
      b: 'To get air pollution data, you can:',
      c: 'find monitoring stations by location',
      d: 'create a custom dataset'
    }
  },
  hub: {
    pageTitle: SERVICE_NAME,
    heading: 'Welcome to the Air Quality Hub',
    subheading: 'Explore air quality data and insights',
    buttonText: 'Get Started',
    texts: {
      a: 'Find monitoring stations by location',
      b: 'View and download data by town or postcode',
      c: 'Create a custom dataset',
      d: 'View and download data by pollutant,year and location.'
    }
  },
  custom: {
    pageTitle: SERVICE_NAME,
    heading: 'Create a custom dataset',
    subheading: 'Explore air quality data and insights',
    buttonText: 'Get Started',
    texts: {
      a: 'Clear selections',
      b: 'Pollutant',
      c: 'Add',
      d: 'View',
      e: ' Data sources',
      f: 'Year',
      g: 'None selected',
      h: 'time period',
      i: 'Location',
      j: 'location',
      k: 'Continue',
      l: 'pollutant',
      m: 'Any',
      n: 'Change',

      datasource: 'Near real-time data from Defra',
      datasource1: 'Automatic Urban and Rural Network (AURN)'
    },
    errorText: {
      uk: {
        fields: {
          title: problemtitle,

          text: 'Select an option before continuing'
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
  }
}
