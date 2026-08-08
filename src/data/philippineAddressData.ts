// Philippine Geographic Address Data (Provinces, Cities/Municipalities, Barangays)
// Built for cascading dropdowns in client registration and address forms.

export interface CityData {
  name: string;
  barangays: string[];
}

export interface ProvinceData {
  name: string;
  cities: CityData[];
}

export const PHILIPPINE_ADDRESS_DATA: ProvinceData[] = [
  {
    name: 'Metro Manila (NCR)',
    cities: [
      {
        name: 'Quezon City',
        barangays: [
          'Brgy. Bungad',
          'Brgy. Socorro (Cubao)',
          'Brgy. Batasan Hills',
          'Brgy. Commonwealth',
          'Brgy. Holy Spirit',
          'Brgy. Kaunlaran (Cubao)',
          'Brgy. Kamuning',
          'Brgy. Loyola Heights',
          'Brgy. Mariana',
          'Brgy. New Manila',
          'Brgy. Pinyahan',
          'Brgy. Project 6',
          'Brgy. Project 8',
          'Brgy. San Antonio',
          'Brgy. Sikatuna Village',
          'Brgy. Teachers Village East',
          'Brgy. Teachers Village West',
          'Brgy. Ugong Norte',
          'Brgy. Vasra',
          'Brgy. Veterans Village',
          'Brgy. South Triangle',
          'Brgy. West Triangle',
          'Brgy. Greater Lagro',
          'Brgy. Fairview',
          'Brgy. Bagong Silangan',
          'Brgy. Tandang Sora',
          'Brgy. Pasong Tamo',
          'Brgy. Culiat',
          'Brgy. San Bartolome',
          'Brgy. Novaliches Proper',
          'Brgy. Payatas',
          'Brgy. UP Campus',
          'Brgy. Roxas',
          'Brgy. Kamias',
          'Brgy. Sacred Heart',
          'Brgy. Laging Handa',
          'Brgy. Paligsahan',
          'Brgy. Central',
          'Brgy. Botocan',
          'Brgy. Krus na Ligas',
          'Brgy. Malaya',
          'Brgy. Old Capitol Site',
          'Brgy. Phil-Am',
          'Brgy. Ramon Magsaysay',
          'Brgy. Alicia',
          'Brgy. Bagong Pag-asa',
          'Brgy. Bahay Toro',
          'Brgy. Balingasa',
          'Brgy. Damar',
          'Brgy. Damayan',
          'Brgy. Del Monte',
          'Brgy. Katipunan',
          'Brgy. Lourdes',
          'Brgy. Mariblo',
          'Brgy. N.S. Amoranto',
          'Brgy. Paang Bundok',
          'Brgy. Pag-ibig sa Nayon',
          'Brgy. Salvacion',
          'Brgy. San Jose',
          'Brgy. Santa Cruz',
          'Brgy. Santa Teresita',
          'Brgy. Santo Domingo',
          'Brgy. Siena',
          'Brgy. Talayan',
          'Brgy. Apolonio Samson',
          'Brgy. Baesa',
          'Brgy. Balumbato',
          'Brgy. Sangandaan',
          'Brgy. Sauyo',
          'Brgy. Talipapa',
          'Brgy. Unang Sigaw'
        ]
      },
      {
        name: 'Manila',
        barangays: [
          'Brgy. Binondo',
          'Brgy. Ermita',
          'Brgy. Intramuros',
          'Brgy. Malate',
          'Brgy. Paco',
          'Brgy. Pandacan',
          'Brgy. Port Area',
          'Brgy. Quiapo',
          'Brgy. Sampaloc',
          'Brgy. San Andres',
          'Brgy. San Miguel',
          'Brgy. San Nicolas',
          'Brgy. Santa Ana',
          'Brgy. Santa Cruz',
          'Brgy. Santa Mesa',
          'Brgy. Tondo I',
          'Brgy. Tondo II'
        ]
      },
      {
        name: 'Makati',
        barangays: [
          'Brgy. Bel-Air',
          'Brgy. Dasmariñas',
          'Brgy. Forbes Park',
          'Brgy. San Lorenzo',
          'Brgy. Urdaneta',
          'Brgy. Poblacion',
          'Brgy. San Antonio',
          'Brgy. Pio del Pilar',
          'Brgy. Olympia',
          'Brgy. Guadalupe Nuevo',
          'Brgy. Guadalupe Viejo',
          'Brgy. Magallanes',
          'Brgy. Bangkal',
          'Brgy. Carmona',
          'Brgy. Cembo',
          'Brgy. Comembo',
          'Brgy. East Rembo',
          'Brgy. West Rembo',
          'Brgy. Pembo',
          'Brgy. Kasilawan',
          'Brgy. La Paz',
          'Brgy. Tejeros',
          'Brgy. Valenzuela',
          'Brgy. Singkamas',
          'Brgy. Palanan',
          'Brgy. San Isidro',
          'Brgy. Pinagkaisahan',
          'Brgy. Pitogo'
        ]
      },
      {
        name: 'Pasig',
        barangays: [
          'Brgy. San Antonio (Ortigas)',
          'Brgy. Kapitolyo',
          'Brgy. Ugong',
          'Brgy. Rosario',
          'Brgy. Caniogan',
          'Brgy. Maybunga',
          'Brgy. Pinagbuhatan',
          'Brgy. Manggahan',
          'Brgy. Dela Paz',
          'Brgy. San Nicolas',
          'Brgy. Bagong Ilog',
          'Brgy. Santa Lucia',
          'Brgy. Santolan',
          'Brgy. Bambang',
          'Brgy. Malinao'
        ]
      },
      {
        name: 'Taguig',
        barangays: [
          'Brgy. Fort Bonifacio (BGC)',
          'Brgy. Pinagsama',
          'Brgy. Ususan',
          'Brgy. Western Bicutan',
          'Brgy. Central Bicutan',
          'Brgy. Upper Bicutan',
          'Brgy. Lower Bicutan',
          'Brgy. Tuktukan',
          'Brgy. Bambang',
          'Brgy. Ligid-Tipas',
          'Brgy. Palingon',
          'Brgy. Napindan',
          'Brgy. Calzada',
          'Brgy. Ibayo-Tipas',
          'Brgy. San Miguel',
          'Brgy. Santa Ana',
          'Brgy. Bagumbayan',
          'Brgy. Maharlika Village'
        ]
      },
      {
        name: 'Mandaluyong',
        barangays: [
          'Brgy. Wack-Wack Greenhills',
          'Brgy. Highway Hills',
          'Brgy. Plainview',
          'Brgy. Addition Hills',
          'Brgy. Barangka Ilaya',
          'Brgy. Barangka Itaas',
          'Brgy. Barangka Ibaba',
          'Brgy. Barangka Drive',
          'Brgy. Hulo',
          'Brgy. Namayan',
          'Brgy. Poblacion',
          'Brgy. San Jose',
          'Brgy. Buayang Bato',
          'Brgy. Malamig',
          'Brgy. Old Zañiga',
          'Brgy. New Zañiga',
          'Brgy. Vergara'
        ]
      },
      {
        name: 'Caloocan',
        barangays: [
          'Brgy. Bagong Barrio',
          'Brgy. Camarin',
          'Brgy. Deparo',
          'Brgy. Grace Park East',
          'Brgy. Grace Park West',
          'Brgy. Sangandaan',
          'Brgy. Tala',
          'Brgy. Bagumbong',
          'Brgy. Caloocan North',
          'Brgy. Caloocan South'
        ]
      },
      {
        name: 'Parañaque',
        barangays: [
          'Brgy. BF Homes',
          'Brgy. Don Bosco',
          'Brgy. La Huerta',
          'Brgy. Moonwalk',
          'Brgy. San Dionisio',
          'Brgy. San Antonio',
          'Brgy. San Martin de Porres',
          'Brgy. Santo Niño',
          'Brgy. Tambo',
          'Brgy. Baclaran'
        ]
      },
      {
        name: 'Las Piñas',
        barangays: [
          'Brgy. Almanza Uno',
          'Brgy. Almanza Dos',
          'Brgy. BF International Village',
          'Brgy. Daniel Fajardo',
          'Brgy. Elias Aldana',
          'Brgy. Pamplona Uno',
          'Brgy. Pamplona Tres',
          'Brgy. Pilar',
          'Brgy. Pulang Lupa Uno',
          'Brgy. Pulang Lupa Dos',
          'Brgy. Talon Uno',
          'Brgy. Talon Dos',
          'Brgy. Zapote'
        ]
      },
      {
        name: 'Muntinlupa',
        barangays: [
          'Brgy. Alabang',
          'Brgy. Ayala Alabang',
          'Brgy. Bayanan',
          'Brgy. Buli',
          'Brgy. Cupang',
          'Brgy. Poblacion',
          'Brgy. Putatan',
          'Brgy. Sucat',
          'Brgy. Tunasan'
        ]
      },
      {
        name: 'Marikina',
        barangays: [
          'Brgy. Barangka',
          'Brgy. Calumpang',
          'Brgy. Concepcion Uno',
          'Brgy. Concepcion Dos',
          'Brgy. Fortune',
          'Brgy. Industrial Valley Complex',
          'Brgy. Jesus Dela Peña',
          'Brgy. Malanday',
          'Brgy. Marikina Heights',
          'Brgy. Nangka',
          'Brgy. Parang',
          'Brgy. San Roque',
          'Brgy. Santa Elena',
          'Brgy. Santo Niño',
          'Brgy. Tumana'
        ]
      },
      {
        name: 'Valenzuela',
        barangays: [
          'Brgy. Gen. T. de Leon',
          'Brgy. Karuhatan',
          'Brgy. Malinta',
          'Brgy. Marulas',
          'Brgy. Paso de Blas',
          'Brgy. Punturin',
          'Brgy. Ugong',
          'Brgy. Bignay',
          'Brgy. Canumay East',
          'Brgy. Canumay West',
          'Brgy. Maysan'
        ]
      },
      {
        name: 'Malabon',
        barangays: [
          'Brgy. Acacia',
          'Brgy. Catmon',
          'Brgy. Concepcion',
          'Brgy. Dampalit',
          'Brgy. Flores',
          'Brgy. Longos',
          'Brgy. Potrero',
          'Brgy. San Agustin',
          'Brgy. Tonsuya',
          'Brgy. Tugatog'
        ]
      },
      {
        name: 'Navotas',
        barangays: [
          'Brgy. Bagumbayan North',
          'Brgy. Bagumbayan South',
          'Brgy. Bangculasi',
          'Brgy. Daanghari',
          'Brgy. Navotas East',
          'Brgy. Navotas West',
          'Brgy. North Bay Boulevard North',
          'Brgy. North Bay Boulevard South',
          'Brgy. San Jose',
          'Brgy. San Roque'
        ]
      },
      {
        name: 'San Juan',
        barangays: [
          'Brgy. Addition Hills',
          'Brgy. Greenhills',
          'Brgy. Little Baguio',
          'Brgy. Pasadena',
          'Brgy. St. Joseph',
          'Brgy. Tibagan',
          'Brgy. West Crame',
          'Brgy. Corazon de Jesus',
          'Brgy. Progreso',
          'Brgy. Rivera'
        ]
      },
      {
        name: 'Pasay',
        barangays: [
          'Brgy. 1 to 201',
          'Brgy. Malibay',
          'Brgy. Maricaban',
          'Brgy. Newport City',
          'Brgy. San Rafael',
          'Brgy. San Roque',
          'Brgy. Villamor',
          'Brgy. Cabrera',
          'Brgy. Libertad'
        ]
      },
      {
        name: 'Pateros',
        barangays: [
          'Brgy. Aguho',
          'Brgy. Magtanggol',
          'Brgy. Martires del 96',
          'Brgy. Poblacion',
          'Brgy. San Roque',
          'Brgy. San Pedro',
          'Brgy. Santa Ana',
          'Brgy. Santo Rosario Kanluran',
          'Brgy. Santo Rosario Silangan',
          'Brgy. Tabacalera'
        ]
      }
    ]
  },
  {
    name: 'Quezon Province',
    cities: [
      {
        name: 'Lucena City',
        barangays: [
          'Brgy. Ibabang Dupay',
          'Brgy. Ibabang Iyam',
          'Brgy. Gulang-Gulang',
          'Brgy. Cotta',
          'Brgy. Dalahican',
          'Brgy. Market View',
          'Brgy. Mayao Crossing',
          'Brgy. Mayao Kanluran',
          'Brgy. Mayao Silangan',
          'Brgy. Isabang',
          'Brgy. Ibabang Talim',
          'Brgy. Barra',
          'Brgy. Domoit',
          'Brgy. Ransohan',
          'Brgy. Salinas',
          'Brgy. Silangang Mayao'
        ]
      },
      {
        name: 'Tayabas City',
        barangays: [
          'Brgy. Poblacion I',
          'Brgy. Poblacion II',
          'Brgy. Poblacion III',
          'Brgy. Poblacion IV',
          'Brgy. Baguio',
          'Brgy. Banilad',
          'Brgy. Calumpang',
          'Brgy. Dapdap',
          'Brgy. Isabang',
          'Brgy. Mate',
          'Brgy. Opias',
          'Brgy. Palandit',
          'Brgy. Tamlong'
        ]
      },
      {
        name: 'Candelaria',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Bukal Sur',
          'Brgy. Bukal Norte',
          'Brgy. Malabanban Norte',
          'Brgy. Malabanban Sur',
          'Brgy. Masin Sur',
          'Brgy. Masin Norte',
          'Brgy. Pahinga Norte',
          'Brgy. Pahinga Sur',
          'Brgy. Santa Catalina Norte',
          'Brgy. Santa Catalina Sur'
        ]
      },
      {
        name: 'Sariaya',
        barangays: [
          'Brgy. Poblacion I',
          'Brgy. Poblacion II',
          'Brgy. Poblacion III',
          'Brgy. Poblacion IV',
          'Brgy. Bignay I',
          'Brgy. Bignay II',
          'Brgy. Concepcion Banahaw',
          'Brgy. Concepcion Palasan',
          'Brgy. Concepcion Pinagbakahan',
          'Brgy. Lutucan 1st',
          'Brgy. Lutucan 2nd',
          'Brgy. Manggalang 1st',
          'Brgy. Manggalang 2nd',
          'Brgy. Montecillo'
        ]
      },
      {
        name: 'Tiaong',
        barangays: [
          'Brgy. Poblacion I',
          'Brgy. Poblacion II',
          'Brgy. Anastacia',
          'Brgy. Cabay',
          'Brgy. Del Rosario',
          'Brgy. Lalig',
          'Brgy. LUSACAN',
          'Brgy. Paiisa',
          'Brgy. San Agustin',
          'Brgy. San Jose'
        ]
      },
      {
        name: 'Pagbilao',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Antipolo',
          'Brgy. Bukal',
          'Brgy. Ibabang Bagumbungan',
          'Brgy. Ilayang Bagumbungan',
          'Brgy. Mapagong',
          'Brgy. Parang',
          'Brgy. Santa Catalina'
        ]
      },
      {
        name: 'Lucban',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Abang',
          'Brgy. Ayuti',
          'Brgy. Kakawit',
          'Brgy. Kalyaat',
          'Brgy. Kulapi',
          'Brgy. Nakar',
          'Brgy. Palola'
        ]
      },
      {
        name: 'Mauban',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Cagsiay I',
          'Brgy. Cagsiay II',
          'Brgy. Luconcito',
          'Brgy. Polo',
          'Brgy. Tapucan'
        ]
      },
      {
        name: 'Atimonan',
        barangays: [
          'Brgy. Zone 1 Poblacion',
          'Brgy. Zone 2 Poblacion',
          'Brgy. Zone 3 Poblacion',
          'Brgy. Zone 4 Poblacion',
          'Brgy. Buhigin',
          'Brgy. Malusak',
          'Brgy. Sapaan'
        ]
      },
      {
        name: 'Gumaca',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Bantad',
          'Brgy. Mabini',
          'Brgy. Rosario',
          'Brgy. Villa Cruz'
        ]
      },
      {
        name: 'Lopez',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Bacungan',
          'Brgy. Magsaysay',
          'Brgy. San Rafael'
        ]
      },
      {
        name: 'Calauag',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Sabang',
          'Brgy. Santa Maria',
          'Brgy. Viñas'
        ]
      }
    ]
  },
  {
    name: 'Cavite',
    cities: [
      {
        name: 'Bacoor City',
        barangays: [
          'Brgy. Panapaan I',
          'Brgy. Panapaan II',
          'Brgy. Panapaan III',
          'Brgy. Panapaan IV',
          'Brgy. Panapaan V',
          'Brgy. Panapaan VI',
          'Brgy. Panapaan VII',
          'Brgy. Panapaan VIII',
          'Brgy. Habay I',
          'Brgy. Habay II',
          'Brgy. Molino I',
          'Brgy. Molino II',
          'Brgy. Molino III',
          'Brgy. Molino IV',
          'Brgy. Molino V',
          'Brgy. Molino VI',
          'Brgy. Molino VII',
          'Brgy. Zapote I',
          'Brgy. Zapote II',
          'Brgy. Zapote III',
          'Brgy. Zapote IV',
          'Brgy. Zapote V',
          'Brgy. Niog I',
          'Brgy. Niog II',
          'Brgy. Niog III',
          'Brgy. Mambog I',
          'Brgy. Mambog II',
          'Brgy. Mambog III',
          'Brgy. Mambog IV',
          'Brgy. Mambog V',
          'Brgy. Talaba I',
          'Brgy. Talaba II',
          'Brgy. Talaba III',
          'Brgy. Talaba IV',
          'Brgy. Talaba V',
          'Brgy. Talaba VI',
          'Brgy. Talaba VII',
          'Brgy. Salinas I',
          'Brgy. Salinas II',
          'Brgy. Salinas III',
          'Brgy. Salinas IV',
          'Brgy. Bayanan',
          'Brgy. Anaban I',
          'Brgy. Anaban II',
          'Brgy. Queens Row East',
          'Brgy. Queens Row West',
          'Brgy. Queens Row Central',
          'Brgy. Real I',
          'Brgy. Real II',
          'Brgy. Sineguelasan',
          'Brgy. Tabing Dagat',
          'Brgy. Alima',
          'Brgy. Campo Santo',
          'Brgy. Digman',
          'Brgy. Kaingen',
          'Brgy. Malansi',
          'Brgy. Poblacion'
        ]
      },
      {
        name: 'Imus City',
        barangays: [
          'Brgy. Anabu I-A',
          'Brgy. Anabu I-B',
          'Brgy. Anabu II-A',
          'Brgy. Anabu II-B',
          'Brgy. Bayan Luma I',
          'Brgy. Bayan Luma II',
          'Brgy. Bucandala I',
          'Brgy. Bucandala II',
          'Brgy. Malagasang I-A',
          'Brgy. Malagasang I-B',
          'Brgy. Malagasang II-A',
          'Brgy. Malagasang II-B',
          'Brgy. Tanzang Luma I',
          'Brgy. Tanzang Luma II',
          'Brgy. Poblacion I-A',
          'Brgy. Carsadang Bago I',
          'Brgy. Carsadang Bago II',
          'Brgy. Toclong I-A'
        ]
      },
      {
        name: 'Dasmariñas City',
        barangays: [
          'Brgy. Burol I',
          'Brgy. Burol II',
          'Brgy. Burol III',
          'Brgy. Salitran I',
          'Brgy. Salitran II',
          'Brgy. Salitran III',
          'Brgy. Salitran IV',
          'Brgy. Sampaloc I',
          'Brgy. Sampaloc II',
          'Brgy. Sampaloc III',
          'Brgy. Sampaloc IV',
          'Brgy. San Agustin I',
          'Brgy. San Agustin II',
          'Brgy. San Agustin III',
          'Brgy. Zone I (Poblacion)',
          'Brgy. Zone II (Poblacion)',
          'Brgy. Zone III (Poblacion)',
          'Brgy. Zone IV (Poblacion)',
          'Brgy. Paliparan I',
          'Brgy. Paliparan II',
          'Brgy. Paliparan III',
          'Brgy. Langkaan I',
          'Brgy. Langkaan II',
          'Brgy. Sabang'
        ]
      },
      {
        name: 'Tagaytay City',
        barangays: [
          'Brgy. Asisan',
          'Brgy. Bagong Tubig',
          'Brgy. Calabuso',
          'Brgy. Dapdap West',
          'Brgy. Dapdap East',
          'Brgy. Kaybagal North',
          'Brgy. Kaybagal South',
          'Brgy. Kaybagal Central',
          'Brgy. Maharlika East',
          'Brgy. Maharlika West',
          'Brgy. Mendez Crossing East',
          'Brgy. Mendez Crossing West',
          'Brgy. Neogan',
          'Brgy. San Jose',
          'Brgy. Silang Junction North',
          'Brgy. Silang Junction South',
          'Brgy. Sungay North',
          'Brgy. Sungay South',
          'Brgy. Tolentino East',
          'Brgy. Tolentino West'
        ]
      },
      {
        name: 'General Trias City',
        barangays: [
          'Brgy. Arnaldo',
          'Brgy. Bacao I',
          'Brgy. Bacao II',
          'Brgy. Gov. Ferrer (Poblacion)',
          'Brgy. Manggahan',
          'Brgy. Navarro',
          'Brgy. Pasong Kawayan I',
          'Brgy. Pasong Kawayan II',
          'Brgy. San Francisco',
          'Brgy. Tejero'
        ]
      },
      {
        name: 'Cavite City',
        barangays: [
          'Brgy. 1 (Hen. M. Alvarez)',
          'Brgy. 2 (Hen. C. Tirona)',
          'Brgy. 3 (Hen. E. Aguinaldo)',
          'Brgy. 4 (San Roque)',
          'Brgy. 5 (Hen. E. Topacio)',
          'Brgy. San Antonio',
          'Brgy. Caridad',
          'Brgy. Dalahican',
          'Brgy. Santa Cruz'
        ]
      },
      {
        name: 'Trece Martires City',
        barangays: [
          'Brgy. Cabezas',
          'Brgy. Cabuco',
          'Brgy. Concepcion',
          'Brgy. De Ocampo',
          'Brgy. Inocencio',
          'Brgy. Lallana',
          'Brgy. Lapidario',
          'Brgy. Luciano',
          'Brgy. Osorio',
          'Brgy. Perez',
          'Brgy. San Agustin',
          'Brgy. Hugo Perez'
        ]
      },
      {
        name: 'Silang',
        barangays: [
          'Brgy. Poblacion',
          'Brgy. Biga I',
          'Brgy. Biga II',
          'Brgy. Biluso',
          'Brgy. Carmen',
          'Brgy. Inchican',
          'Brgy. Lucsuhin',
          'Brgy. Tartaria'
        ]
      },
      {
        name: 'Kawit',
        barangays: [
          'Brgy. Binakayan-Kanluran',
          'Brgy. Gahak',
          'Brgy. Magdalo',
          'Brgy. Poblacion',
          'Brgy. Tabon I',
          'Brgy. Tabon II',
          'Brgy. Wakas I'
        ]
      },
      {
        name: 'Naic',
        barangays: [
          'Brgy. Bucana Malaki',
          'Brgy. Ibayo Silangan',
          'Brgy. Halang',
          'Brgy. Poblacion',
          'Brgy. Sabang',
          'Brgy. Timalan Balsahan'
        ]
      },
      {
        name: 'Carmona',
        barangays: [
          'Brgy. Cabilang Baybay',
          'Brgy. Lantic',
          'Brgy. Mabuhay',
          'Brgy. Maduya',
          'Brgy. Poblacion 1 to 8'
        ]
      }
    ]
  },
  {
    name: 'Laguna',
    cities: [
      {
        name: 'Calamba City',
        barangays: [
          'Brgy. Bucal',
          'Brgy. Canlubang',
          'Brgy. Halang',
          'Brgy. Mapagong',
          'Brgy. Paciano Rizal',
          'Brgy. Real',
          'Brgy. Turbina',
          'Brgy. Uno (Poblacion)',
          'Brgy. Barandal',
          'Brgy. Mayapa'
        ]
      },
      {
        name: 'Santa Rosa City',
        barangays: [
          'Brgy. Balibago',
          'Brgy. Don Jose',
          'Brgy. Dita',
          'Brgy. Dila',
          'Brgy. Ibaba',
          'Brgy. Labas',
          'Brgy. Macabling',
          'Brgy. Malitlit',
          'Brgy. Market Area',
          'Brgy. Sinalhan',
          'Brgy. Tagapo'
        ]
      },
      {
        name: 'Biñan City',
        barangays: [
          'Brgy. Canlalay',
          'Brgy. De La Paz',
          'Brgy. Langkiwa',
          'Brgy. Mamplasan',
          'Brgy. Poblacion',
          'Brgy. San Francisco',
          'Brgy. Santo Tomas',
          'Brgy. Zapote'
        ]
      },
      {
        name: 'San Pedro City',
        barangays: [
          'Brgy. Chrysanthemum',
          'Brgy. Fatima',
          'Brgy. Landayan',
          'Brgy. Langgam',
          'Brgy. Pacita 1',
          'Brgy. Pacita 2',
          'Brgy. Poblacion',
          'Brgy. San Antonio',
          'Brgy. San Vicente'
        ]
      },
      {
        name: 'Cabuyao City',
        barangays: [
          'Brgy. Banaybanay',
          'Brgy. Banlic',
          'Brgy. Bigaa',
          'Brgy. Diezmo',
          'Brgy. Gulod',
          'Brgy. Mamatid',
          'Brgy. Niugan',
          'Brgy. Poblacion Uno',
          'Brgy. Sala'
        ]
      },
      {
        name: 'San Pablo City',
        barangays: [
          'Brgy. I-A (Poblacion)',
          'Brgy. Concepcion',
          'Brgy. Del Remedios',
          'Brgy. San Francisco',
          'Brgy. San Gabriel',
          'Brgy. San Jose',
          'Brgy. San Lucas 1',
          'Brgy. San Rafael'
        ]
      },
      {
        name: 'Los Baños',
        barangays: [
          'Brgy. Batong Malake',
          'Brgy. Bayog',
          'Brgy. Lalakay',
          'Brgy. Mayndon',
          'Brgy. San Antonio',
          'Brgy. Tadlac',
          'Brgy. Timugan'
        ]
      }
    ]
  },
  {
    name: 'Batangas',
    cities: [
      {
        name: 'Batangas City',
        barangays: [
          'Brgy. Alangilan',
          'Brgy. Balagtas',
          'Brgy. Bolbok',
          'Brgy. Cuta',
          'Brgy. Gulod Labac',
          'Brgy. Kumintang Ibaba',
          'Brgy. Kumintang Ilaya',
          'Brgy. Libjo',
          'Brgy. Pallocan Silangan',
          'Brgy. Pallocan Kanluran',
          'Brgy. Poblacion 1 to 24',
          'Brgy. Sorosoro Karsada',
          'Brgy. Tabangao Aplaya'
        ]
      },
      {
        name: 'Lipa City',
        barangays: [
          'Brgy. Balintawak',
          'Brgy. Bugtone',
          'Brgy. Dagatan',
          'Brgy. Inosloban',
          'Brgy. Marawoy',
          'Brgy. Mataas na Lupa',
          'Brgy. Poblacion Barangay 1 to 12',
          'Brgy. Sabang',
          'Brgy. Tambo'
        ]
      },
      {
        name: 'Tanauan City',
        barangays: [
          'Brgy. Bagumbayan',
          'Brgy. Darasa',
          'Brgy. Janopol',
          'Brgy. Natatas',
          'Brgy. Poblacion 1 to 7',
          'Brgy. Sambat',
          'Brgy. Trapiche'
        ]
      },
      {
        name: 'Sto. Tomas City',
        barangays: [
          'Brgy. San Bartolome',
          'Brgy. San Felix',
          'Brgy. San Jose',
          'Brgy. San Pedro',
          'Brgy. San Roque',
          'Brgy. San Vicente',
          'Brgy. Santa Anastacia',
          'Brgy. Santo Tomas Poblacion'
        ]
      },
      {
        name: 'Nasugbu',
        barangays: [
          'Brgy. Bucana',
          'Brgy. Cogunan',
          'Brgy. Natipuan',
          'Brgy. Poblacion 1 to 12',
          'Brgy. Wawa'
        ]
      }
    ]
  },
  {
    name: 'Rizal',
    cities: [
      {
        name: 'Antipolo City',
        barangays: [
          'Brgy. Bagong Nayon',
          'Brgy. Beverly Hills',
          'Brgy. Calawis',
          'Brgy. Cupang',
          'Brgy. Dalig',
          'Brgy. Dela Paz',
          'Brgy. Inarawan',
          'Brgy. Mambugan',
          'Brgy. Mayamot',
          'Brgy. San Jose',
          'Brgy. San Isidro',
          'Brgy. San Juan',
          'Brgy. San Luis',
          'Brgy. San Roque',
          'Brgy. Santa Cruz',
          'Brgy. Muntingdilaw'
        ]
      },
      {
        name: 'Cainta',
        barangays: [
          'Brgy. San Andres',
          'Brgy. San Isidro',
          'Brgy. San Juan',
          'Brgy. San Roque',
          'Brgy. Santa Rosa',
          'Brgy. Santo Domingo',
          'Brgy. Santo Niño'
        ]
      },
      {
        name: 'Taytay',
        barangays: [
          'Brgy. Dolores (Poblacion)',
          'Brgy. Muzon',
          'Brgy. San San Juan',
          'Brgy. San Isidro',
          'Brgy. Sta. Ana'
        ]
      },
      {
        name: 'San Mateo',
        barangays: [
          'Brgy. Ampid I',
          'Brgy. Ampid II',
          'Brgy. Banaba',
          'Brgy. Dulong Bayan 1',
          'Brgy. Dulong Bayan 2',
          'Brgy. Guitnang Bayan 1',
          'Brgy. Guitnang Bayan 2',
          'Brgy. Maly',
          'Brgy. Silangan'
        ]
      },
      {
        name: 'Rodriguez (Montalban)',
        barangays: [
          'Brgy. Balite',
          'Brgy. Burgos',
          'Brgy. Geronimo',
          'Brgy. Macabud',
          'Brgy. San Jose',
          'Brgy. San Rafael'
        ]
      },
      {
        name: 'Angono',
        barangays: [
          'Brgy. Bagumbayan',
          'Brgy. Kalayaan',
          'Brgy. Poblacion Ibaba',
          'Brgy. Poblacion Itaas',
          'Brgy. San Isidro',
          'Brgy. San Pedro',
          'Brgy. San Vicente',
          'Brgy. Santo Niño'
        ]
      },
      {
        name: 'Binangonan',
        barangays: [
          'Brgy. Bilibiran',
          'Brgy. Calumpang',
          'Brgy. Libis',
          'Brgy. Macamot',
          'Brgy. Mambog',
          'Brgy. Pag-asa',
          'Brgy. Tagpos'
        ]
      }
    ]
  },
  {
    name: 'Bulacan',
    cities: [
      {
        name: 'Malolos City',
        barangays: [
          'Brgy. Guinhawa',
          'Brgy. Longos',
          'Brgy. Lugam',
          'Brgy. Mabolo',
          'Brgy. Mojon',
          'Brgy. San Gabriel',
          'Brgy. Sumapang Matanda',
          'Brgy. Tikay'
        ]
      },
      {
        name: 'Meycauayan City',
        barangays: [
          'Brgy. Bangcal',
          'Brgy. Calvario',
          'Brgy. Camalig',
          'Brgy. Malhacan',
          'Brgy. Saluysoy',
          'Brgy. Zamora'
        ]
      },
      {
        name: 'San Jose del Monte City',
        barangays: [
          'Brgy. Ciudad Real',
          'Brgy. Graceville',
          'Brgy. Kaypian',
          'Brgy. Muzon',
          'Brgy. Poblacion',
          'Brgy. Tungkong Mangga'
        ]
      },
      {
        name: 'Marilao',
        barangays: [
          'Brgy. Abangan Norte',
          'Brgy. Abangan Sur',
          'Brgy. Ibayo',
          'Brgy. Lias',
          'Brgy. Tabing Ilog'
        ]
      },
      {
        name: 'Santa Maria',
        barangays: [
          'Brgy. Bagbaguin',
          'Brgy. Caypombo',
          'Brgy. Guyong',
          'Brgy. Poblacion',
          'Brgy. Pulong Buhangin'
        ]
      }
    ]
  },
  {
    name: 'Pampanga',
    cities: [
      {
        name: 'Angeles City',
        barangays: [
          'Brgy. Balibago',
          'Brgy. Cutcut',
          'Brgy. Malabanias',
          'Brgy. Pulung Maragul',
          'Brgy. Santo Rosario',
          'Brgy. Pandan'
        ]
      },
      {
        name: 'San Fernando City',
        barangays: [
          'Brgy. Dolores',
          'Brgy. Maimpis',
          'Brgy. San Agustin',
          'Brgy. San Jose',
          'Brgy. Sindalan',
          'Brgy. Telabastagan'
        ]
      },
      {
        name: 'Mabalacat City',
        barangays: [
          'Brgy. Dau',
          'Brgy. Mabiga',
          'Brgy. Poblacion',
          'Brgy. San Francisco',
          'Brgy. Tabun'
        ]
      }
    ]
  },
  {
    name: 'Benguet',
    cities: [
      {
        name: 'Baguio City',
        barangays: [
          'Brgy. Session Road Area',
          'Brgy. Burnham - Legarda',
          'Brgy. Irisan',
          'Brgy. Loakan Proper',
          'Brgy. Pacdal',
          'Brgy. Camp 7',
          'Brgy. Camp 8',
          'Brgy. Gibraltar',
          'Brgy. Mines View Park',
          'Brgy. Asin Road',
          'Brgy. Bakakeng Central',
          'Brgy. Guisad',
          'Brgy. Magsaysay',
          'Brgy. Aurora Hill',
          'Brgy. Pinsao Proper'
        ]
      },
      {
        name: 'La Trinidad',
        barangays: [
          'Brgy. Ambiong',
          'Brgy. Balili',
          'Brgy. Betag',
          'Brgy. Pico',
          'Brgy. Poblacion',
          'Brgy. Puguis'
        ]
      }
    ]
  },
  {
    name: 'Cebu',
    cities: [
      {
        name: 'Cebu City',
        barangays: [
          'Brgy. Lahug',
          'Brgy. Mabolo',
          'Brgy. Banilad',
          'Brgy. Guadalupe',
          'Brgy. Zapatera',
          'Brgy. Luz',
          'Brgy. Kasambagan',
          'Brgy. Tisa',
          'Brgy. Labangon',
          'Brgy. Capitol Site',
          'Brgy. Sambag I',
          'Brgy. Sambag II',
          'Brgy. Punta Princesa',
          'Brgy. Talamban',
          'Brgy. Kamputhaw',
          'Brgy. Basak San Nicolas',
          'Brgy. Pardo'
        ]
      },
      {
        name: 'Mandaue City',
        barangays: [
          'Brgy. Bakilid',
          'Brgy. Banilad',
          'Brgy. Cabancalan',
          'Brgy. Centro',
          'Brgy. Maguikay',
          'Brgy. Subangdaku',
          'Brgy. Tipolo'
        ]
      },
      {
        name: 'Lapu-Lapu City',
        barangays: [
          'Brgy. Basak',
          'Brgy. Mactan',
          'Brgy. Marigondon',
          'Brgy. Maribago',
          'Brgy. Poblacion',
          'Brgy. Pajo',
          'Brgy. Pusok'
        ]
      },
      {
        name: 'Talisay City',
        barangays: [
          'Brgy. Bulacao',
          'Brgy. Cansojong',
          'Brgy. Dumlog',
          'Brgy. Lawaan I',
          'Brgy. Lawaan II',
          'Brgy. Poblacion',
          'Brgy. San Roque'
        ]
      }
    ]
  },
  {
    name: 'Davao del Sur',
    cities: [
      {
        name: 'Davao City',
        barangays: [
          'Brgy. Poblacion (District 1)',
          'Brgy. Buhangin',
          'Brgy. Matina Crossing',
          'Brgy. Matina Aplaya',
          'Brgy. Talomo',
          'Brgy. Agdao',
          'Brgy. Toril',
          'Brgy. Calinan',
          'Brgy. Tugbok',
          'Brgy. Bunawan',
          'Brgy. Sasa',
          'Brgy. Lanang',
          'Brgy. Ma-a',
          'Brgy. Catalunan Grande',
          'Brgy. Mintal'
        ]
      },
      {
        name: 'Digos City',
        barangays: [
          'Brgy. Aplaya',
          'Brgy. Dawis',
          'Brgy. Dulangan',
          'Brgy. Zone 1 (Poblacion)',
          'Brgy. Zone 2 (Poblacion)',
          'Brgy. Zone 3 (Poblacion)'
        ]
      }
    ]
  },
  {
    name: 'Iloilo',
    cities: [
      {
        name: 'Iloilo City',
        barangays: [
          'Brgy. City Proper',
          'Brgy. Mandurriao',
          'Brgy. Jaro',
          'Brgy. Molo',
          'Brgy. La Paz',
          'Brgy. Arevalo',
          'Brgy. Lapuz'
        ]
      }
    ]
  },
  {
    name: 'Pangasinan',
    cities: [
      {
        name: 'Dagupan City',
        barangays: [
          'Brgy. Bonuan Gueset',
          'Brgy. Bonuan Boquig',
          'Brgy. Caranglaan',
          'Brgy. Lucao',
          'Brgy. Poblacion Oeste',
          'Brgy. Tapuac'
        ]
      },
      {
        name: 'Urdaneta City',
        barangays: [
          'Brgy. Anonas',
          'Brgy. Nancayasan',
          'Brgy. Poblacion',
          'Brgy. San Vicente'
        ]
      }
    ]
  }
];

// Helper to get all Provinces
export function getProvinces(): string[] {
  return PHILIPPINE_ADDRESS_DATA.map(p => p.name);
}

// Helper to get Cities/Municipalities given a Province
export function getCitiesByProvince(provinceName: string): string[] {
  const prov = PHILIPPINE_ADDRESS_DATA.find(p => p.name.toLowerCase() === provinceName.toLowerCase());
  if (!prov) return [];
  return prov.cities.map(c => c.name);
}

// Helper to get Barangays given a City Name
export function getBarangaysByCity(cityName: string): string[] {
  for (const prov of PHILIPPINE_ADDRESS_DATA) {
    const city = prov.cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (city) return city.barangays;
  }
  return [];
}

// Helper to find Province for a City Name (auto-cascade vice versa)
export function findProvinceForCity(cityName: string): string | null {
  for (const prov of PHILIPPINE_ADDRESS_DATA) {
    const city = prov.cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (city) return prov.name;
  }
  return null;
}

// Helper to get ALL Cities across all provinces
export function getAllCities(): { cityName: string; provinceName: string }[] {
  const result: { cityName: string; provinceName: string }[] = [];
  for (const prov of PHILIPPINE_ADDRESS_DATA) {
    for (const city of prov.cities) {
      result.push({ cityName: city.name, provinceName: prov.name });
    }
  }
  return result;
}
