/*
 * Lieux du réseau : bibliothèques, centres de conservation, points de service
 * et Prêt entre bibliothèques. Source unique de /horaires/ (CarteHoraires),
 * de la recherche du site et du répertoire du personnel (data/bibliotheques).
 *
 * Réunit ce que coquille-web dispersait : src/components/CarteHoraires/
 * points-de-service.json (champs anglais, gardés pour le portage de la carte)
 * et les props JSX des 19 fiches de content/bibliotheques/*.mdx (`fiche`).
 * horaires.mdx recopiait ces fiches à la main ; il n'y a plus de copie.
 *
 * Deux jeux d'identifiants coexistent et ne doivent pas changer, des liens y
 * pointent : `id` est l'ancre de /horaires/ (#lettres-et-sciences-humaines) ;
 * `fiche.id` est l'ancienne ancre des fiches de /espaces/ (#lsh, et
 * « Hubert-reeves » avec sa majuscule), encore acceptée par le répertoire du
 * personnel (/nous-joindre/notre-equipe/#sante). Les textes des fiches sont ceux de la source, coquilles
 * comprises. Seuls des liens cassés ont été corrigés : « mailto7077duParc@ »
 * (Parc), « mailto=pret-kinesiologie@ » et « sante@ » sans mailto:
 * (Kinésiologie), href="#" pour lsh@ (LSH), et l'itinéraire de Hubert-Reeves,
 * qui menait au répertoire du personnel (remplacé par les coordonnées de la
 * carte). Les liens relatifs « ../nous-joindre/… » sont devenus absolus.
 */

export type Zone = 'library' | 'conservation' | 'points-service' | 'service'

/** Texte d'une fiche : chaîne, lien ou passage en gras */
export type Segment = string | { texte: string; lien: string } | { gras: string }
export type Ligne = string | Segment[]
/** Petit sous-ensemble de HTML des fiches de la source : paragraphe, liste à puces, encadré */
export type Bloc = { p: Ligne } | { ul: Ligne[] } | { alerte: Bloc[] }

export interface Fiche {
  /** Ancien identifiant de la fiche (ancre du répertoire du personnel) */
  id: string
  titre: string
  /** false ou absent : pas de bloc Espaces */
  espaces?: false | Bloc[]
  /** Lignes du bloc Adresse */
  adresse: string[]
  itineraire: string
  nousJoindre?: Bloc[]
  /** Lien « Répertoire du personnel » ; `fleche` : avec la flèche de Lien */
  repertoire?: { lien: string; fleche: boolean }
  /** Contenu libre sous Nous joindre (enfants de FicheBibliotheque) */
  enfants?: Bloc[]
}

export interface Lieu {
  /** Ancre dans /horaires/ */
  id: string
  name: string
  zone: Zone
  aliases?: string[]
  /** Adresse sur une ligne (carte et données structurées) */
  addr?: string
  pavillon?: string
  lat?: number
  lng?: number
  /** Code de l'API horaires ; absent : horaire non publié */
  codeBib?: string
  contact?: { label: string; phone?: string; email?: string }[]
  /** Ancre du répertoire du personnel */
  staffFragment?: string
  spaces?: { label: string; url?: string }[]
  reservations?: { label: string; url: string }[]
  note?: string
  noteLink?: { label: string; url: string }
  fiche?: Fiche
}

export const lieux: Lieu[] = [
  {
    id: "pret-entre-bibliotheques",
    name: "Prêt entre bibliothèques",
    aliases: [
      "PEB"
    ],
    zone: "service",
    codeBib: "pb"
  },
  {
    id: "amenagement",
    name: "Bibliothèque d'aménagement",
    zone: "library",
    addr: "Pavillon de la Faculté de l'aménagement, 2940 chemin de la Côte-Sainte-Catherine, salle 1162",
    pavillon: "Pavillon de la Faculté de l'aménagement",
    lat: 45.504475,
    lng: -73.620621,
    codeBib: "am",
    contact: [
      {
        label: "Comptoir de prêt, réserve de cours",
        phone: "514 343-6111, poste 2737",
        email: "pret-amenagement@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "514 343-6111, poste 39837",
        email: "amenagement@bib.umontreal.ca"
      }
    ],
    staffFragment: "amenagement",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "amenagement",
      titre: "Aménagement",
      espaces: false,
      adresse: [
        "Bibliothèque d'aménagement",
        "Pavillon de la Faculté de l'aménagement",
        "2940, chemin de la Côte-Sainte-Catherine, salle 1162"
      ],
      itineraire: "https://www.google.com/maps/place/Pavillon+de+la+Facult%C3%A9+de+I'am%C3%A9nagement,+2940+Chem.+de+la+C%C3%B4te-Sainte-Catherine,+Montr%C3%A9al,+QC+H3S+2C2,+Canada/@45.504475,-73.620621,4251m/data=!3m1!1e3!4m6!3m5!1s0x4cc91992da0f9677:0xda3129520f89d791!8m2!3d45.504475!4d-73.6206208!16s%2Fg%2F1tghp63h?hl=en&entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoASAFQAw%3D%3D",
      nousJoindre: [
        {
          p: "Comptoir de prêt, réserve de cours"
        },
        {
          ul: [
            "514 343-6111, poste 2737",
            [
              {
                texte: "pret-amenagement@bib.umontreal.ca",
                lien: "mailto:pret-amenagement@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            "514 343-6111, poste 39837",
            [
              {
                texte: "amenagement@bib.umontreal.ca",
                lien: "mailto:amenagement@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#amenagement",
        fleche: false
      }
    }
  },
  {
    id: "campus-de-laval",
    name: "Bibliothèque du campus de l'UdeM à Laval",
    zone: "library",
    addr: "Campus de l'UdeM à Laval, 1700 rue Jacques-Tétreault, salle 2200",
    pavillon: "Campus de l'UdeM à Laval",
    lat: 45.55873,
    lng: -73.721038,
    codeBib: "laval",
    contact: [
      {
        label: "Comptoir de prêt",
        phone: "514 343-6111, poste 45161",
        email: "pret-laval@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "514 343-6111, poste 45160",
        email: "refepcaml@bib.umontreal.ca"
      }
    ],
    spaces: [
      {
        label: "Didacthèque",
        url: "https://calendrier.bib.umontreal.ca/space/17823"
      }
    ],
    staffFragment: "laval",
    reservations: [
      {
        label: "Salle de travail individuelle",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Didacthèque pour les sciences de l'éducation",
        url: "https://calendrier.bib.umontreal.ca/space/17823"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "laval",
      titre: "Campus de Laval",
      espaces: [
        {
          ul: [
            [
              {
                texte: "Didacthèque",
                lien: "https://calendrier.bib.umontreal.ca/space/17823"
              }
            ]
          ]
        }
      ],
      adresse: [
        "Bibliothèque du campus de l'UdeM à Laval",
        "Campus de l'UdeM à Laval",
        "1700, rue Jacques-Tétreault, salle 2200"
      ],
      itineraire: "https://www.google.com/maps?ll=45.55873,-73.721038&z=15&t=m&hl=en&gl=US&mapclient=embed&cid=4376201812221272737",
      nousJoindre: [
        {
          p: "Comptoir de prêt"
        },
        {
          ul: [
            "514 343-6111, poste 45161",
            [
              {
                texte: "pret-laval@bib.umontreal.ca",
                lien: "mailto:pret-laval@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            "514 343-6111, poste 45160",
            [
              {
                texte: "laval@bib.umontreal.ca",
                lien: "mailto:laval@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#laval",
        fleche: true
      }
    }
  },
  {
    id: "centre-de-conservation-lionel-groulx",
    name: "Centre de conservation Lionel-Groulx",
    zone: "conservation",
    addr: "Pavillon Lionel-Groulx, 3150 rue Jean-Brillant, salle C-1017-16 (porte C-1059)",
    pavillon: "Pavillon Lionel-Groulx",
    lat: 45.499267,
    lng: -73.618308,
    codeBib: "conservation",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 42680",
        email: "pret-conservation@bib.umontreal.ca"
      }
    ],
    staffFragment: "conservation",
    fiche: {
      id: "conservation",
      titre: "Centre de conservation Lionel-Groulx",
      espaces: false,
      adresse: [
        "Centre de conservation Lionel-Groulx",
        "Pavillon Lionel-Groulx",
        "3150, rue Jean-Brillant",
        "salle C-1017-16 (par la porte C-1059)"
      ],
      itineraire: "https://www.google.com/maps?ll=45.499267,-73.618308&z=15&t=m&hl=en&gl=US&mapclient=embed&cid=5977889247530305618",
      nousJoindre: [
        {
          p: "Accueil et prêt"
        },
        {
          ul: [
            "514 343-6111, poste 42680",
            [
              {
                texte: "pret-conservation@bib.umontreal.ca",
                lien: "mailto:pret-conservation@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#conservation",
        fleche: true
      },
      enfants: [
        {
          alerte: [
            {
              p: [
                "Les rayons du Centre de conservation Lionel-Groulx sont inaccessibles au public. Le personnel se fera un plaisir d'aller chercher vos documents. Pour une liste de 5 documents et plus, il faut nous faire parvenir d'avance les références par ",
                {
                  texte: "courriel",
                  lien: "mailto:pret-conservation@bib.umontreal.ca"
                },
                "."
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "centre-de-conservation-101-boul-marcel-laurin",
    name: "Centre de conservation – 101, boul. Marcel-Laurin",
    // Nom employé dans le tableur du répertoire du personnel
    aliases: [
      "Centre de conservation Marcel-Laurin"
    ],
    zone: "conservation",
    addr: "101 boul. Marcel-Laurin, suite 150, Saint-Laurent — sur rendez-vous",
    pavillon: "101, boul. Marcel-Laurin",
    lat: 45.503789,
    lng: -73.670906,
    codeBib: "marcel-laurin",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 42680",
        email: "pr101ml@bib.umontreal.ca"
      }
    ],
    staffFragment: "marcel-laurin",
    note: "L'emprunt se fait par réservation dans Sofia ou par numérisation d'article ou de chapitre de livre. Délai de livraison : 3 à 9 jours pour les documents imprimés. Consultation sur place possible sur rendez-vous seulement.",
    fiche: {
      id: "marcel-laurin",
      titre: "Centre de conservation 101, boul. Marcel-Laurin",
      espaces: false,
      adresse: [
        "Centre de conservation – 101, boul. Marcel-Laurin",
        "101, boul. Marcel-Laurin, suite 150"
      ],
      itineraire: "https://www.google.com/maps?ll=45.503789,-73.670906&z=15&t=m&hl=fr&gl=CA&mapclient=embed&q=101+Blvd.+Marcel-Laurin+Saint-Laurent,+QC+H4N+2M3",
      nousJoindre: [
        {
          p: "Accueil et prêt (sur rendez-vous)"
        },
        {
          ul: [
            "514 343-6111, poste 42680",
            [
              {
                texte: "pr101ml@bib.umontreal.ca",
                lien: "mailto:pr101ml@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#marcel-laurin",
        fleche: true
      },
      enfants: [
        {
          alerte: [
            {
              p: "L’emprunt se fait par réservation dans Sofia ou par numérisation d'article ou de chapitre de livre. Le délai de livraison est de 3 à 9 jours pour les documents imprimés."
            },
            {
              p: "La consultation de documents sur place est possible sur rendez-vous seulement. Veuillez nous écrire pour prendre rendez-vous."
            },
            {
              p: [
                {
                  gras: "Le Centre de conservation 101, boul. Marcel-Laurin est ouvert sur rendez-vous seulement. Contactez-nous avant de vous déplacer."
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "droit",
    name: "Bibliothèque de droit",
    zone: "library",
    addr: "Pavillon Maximilien-Caron, 3101 chemin de la Tour, 4e étage, salle 4433",
    pavillon: "Pavillon Maximilien-Caron",
    lat: 45.498692,
    lng: -73.616975,
    codeBib: "dr",
    contact: [
      {
        label: "Comptoir de prêt",
        phone: "514 343-6111, poste 3790",
        email: "pret-droit@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "514 343-6111, poste 3756",
        email: "droit@bib.umontreal.ca"
      }
    ],
    spaces: [
      {
        label: "Salles de travail pour les cycles supérieurs"
      }
    ],
    staffFragment: "droit",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "droit",
      titre: "Droit",
      espaces: [
        {
          ul: [
            "Salles de travail pour les cycles supérieurs"
          ]
        }
      ],
      adresse: [
        "Bibliothèque de droit",
        "Pavillon Maximilien-Caron",
        "3101, chemin de la Tour, 4e étage, salle 4433"
      ],
      itineraire: "https://www.google.com/maps?ll=45.498692,-73.616975&z=15&t=m&hl=en&gl=US&mapclient=embed&q=Pavillon+Maximilien-Caron+3101+Tour+Rd+Montreal,+QC+H3T+1N8",
      nousJoindre: [
        {
          p: "Comptoir de prêt"
        },
        {
          ul: [
            "514 343-6111, poste 3790",
            [
              {
                texte: "pret-droit@bib.umontreal.ca",
                lien: "mailto:pret-droit@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            "514 343-6111, poste 3756",
            [
              {
                texte: "droit@bib.umontreal.ca",
                lien: "mailto:droit@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#droit",
        fleche: true
      }
    }
  },
  {
    id: "hubert-reeves",
    name: "Bibliothèque Hubert-Reeves",
    aliases: [
      "Bibliothèque des sciences",
      "sciences"
    ],
    zone: "library",
    addr: "Complexe des sciences, Campus MIL, 1375 avenue Thérèse-Lavoie-Roux, salle A-150",
    pavillon: "Complexe des sciences, Campus MIL",
    lat: 45.5231141,
    lng: -73.6222354,
    codeBib: "sciences",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 5038",
        email: "pret-hr@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        email: "sciences@bib.umontreal.ca"
      }
    ],
    spaces: [
      {
        label: "Cartothèque"
      },
      {
        label: "Atelier de fabrication",
        url: "https://studio.bib.umontreal.ca/espaces/ateliers/"
      },
      {
        label: "Studio balado audio",
        url: "https://studio.bib.umontreal.ca/espaces/studiosbaladoaudio/"
      },
      {
        label: "Laboratoire de visualisation",
        url: "https://studio.bib.umontreal.ca/espaces/visualisation/"
      },
      {
        label: "Salle Accessibilité",
        url: "/service-accessibilite/#salle-adaptee-a-la-bibliotheque-hubert-reeves"
      }
    ],
    staffFragment: "Hubert-reeves",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "Hubert-reeves",
      titre: "Hubert-Reeves",
      espaces: [
        {
          ul: [
            "Cartothèque",
            [
              {
                texte: "Atelier de fabrication",
                lien: "https://studio.bib.umontreal.ca/espaces/ateliers/"
              }
            ],
            [
              {
                texte: "Studio balado audio",
                lien: "https://studio.bib.umontreal.ca/espaces/studiosbaladoaudio/"
              }
            ],
            [
              {
                texte: "Laboratoire de visualisation",
                lien: "https://studio.bib.umontreal.ca/espaces/visualisation/"
              }
            ],
            [
              {
                texte: "Salle Accessibilité",
                lien: "/service-accessibilite/#salle-adaptee-a-la-bibliotheque-hubert-reeves"
              }
            ]
          ]
        }
      ],
      adresse: [
        "Bibliothèque Hubert-Reeves",
        "Complexe des sciences du campus MIL",
        "1375, avenue Thérèse-Lavoie-Roux, salle A-150"
      ],
      itineraire: "https://www.google.com/maps/dir/?api=1&destination=45.5231141,-73.6222354",
      nousJoindre: [
        {
          p: "Accueil et prêt"
        },
        {
          ul: [
            "514 343-6111, poste 5038",
            [
              {
                texte: "pret-hr@bib.umontreal.ca",
                lien: "mailto:pret-hr@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            [
              {
                texte: "sciences@bib.umontreal.ca",
                lien: "mailto:sciences@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#Hubert-reeves",
        fleche: true
      }
    }
  },
  {
    id: "kinesiologie",
    name: "Bibliothèque de kinésiologie",
    zone: "library",
    addr: "CEPSUM, 2100 boul. Édouard-Montpetit, 8e étage, salle 8259",
    pavillon: "CEPSUM",
    lat: 45.508257,
    lng: -73.612766,
    codeBib: "ki",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 3792",
        email: "pret-kinesiologie@bib.umontreal.ca"
      },
      {
        label: "Référence",
        email: "sante@bib.umontreal.ca"
      }
    ],
    staffFragment: "kinesiologie",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "kinesiologie",
      titre: "Kinésiologie",
      espaces: false,
      adresse: [
        "Bibliothèque de kinésiologie",
        "Centre d'éducation physique et des sports (CEPSUM)",
        "2100, boul. Édouard-Montpetit, 8e étage, salle 8259"
      ],
      itineraire: "https://www.google.com/maps?ll=45.508257,-73.612766&z=15&t=m&hl=en&gl=US&mapclient=embed&q=CEPSUM+2100+Edouard+Montpetit+Blvd+Montreal,+QC+H3T+1J4",
      nousJoindre: [
        {
          p: "Accueil et prêt"
        },
        {
          ul: [
            "514 343-6111, poste 3792",
            [
              {
                texte: "pret-kinesiologie@bib.umontreal.ca",
                lien: "mailto:pret-kinesiologie@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Référence"
        },
        {
          ul: [
            [
              {
                texte: "sante@bib.umontreal.ca",
                lien: "mailto:sante@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#kinesiologie",
        fleche: true
      }
    }
  },
  {
    id: "lettres-et-sciences-humaines",
    name: "Bibliothèque des lettres et sciences humaines (BLSH)",
    aliases: [
      "BLSH",
      "LSH"
    ],
    zone: "library",
    addr: "Pavillon Samuel-Bronfman, 3000 rue Jean-Brillant, salle 1030",
    pavillon: "Pavillon Samuel-Bronfman",
    lat: 45.499427,
    lng: -73.616554,
    codeBib: "ss",
    contact: [
      {
        label: "Comptoir de prêt, réserve de cours",
        phone: "514 343-7336",
        email: "pret-lsh@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "514 343-6111, poste 2655",
        email: "lsh@bib.umontreal.ca"
      }
    ],
    spaces: [
      {
        label: "Amphithéâtre",
        url: "https://studio.bib.umontreal.ca/espaces/amphitheatre"
      },
      {
        label: "Atelier de zines",
        url: "https://studio.bib.umontreal.ca/espaces/zines"
      },
      {
        label: "Studio balado vidéo",
        url: "https://studio.bib.umontreal.ca/espaces/studiobaladovideo/"
      },
      {
        label: "Studio vidéo",
        url: "https://studio.bib.umontreal.ca/espaces/studiovideo/"
      },
      {
        label: "Salles Accessibilité",
        url: "/service-accessibilite/#acces-a-des-salles-de-travail-adaptees"
      }
    ],
    staffFragment: "lsh",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Salle individuelle pour les étudiants des cycles supérieurs",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "lsh",
      titre: "Lettres et sciences humaines",
      espaces: [
        {
          ul: [
            [
              {
                texte: "Amphithéâtre",
                lien: "https://studio.bib.umontreal.ca/espaces/amphitheatre"
              }
            ],
            [
              {
                texte: "Atelier de zines",
                lien: "https://studio.bib.umontreal.ca/espaces/zines"
              }
            ],
            [
              {
                texte: "Studio balado vidéo",
                lien: "https://studio.bib.umontreal.ca/espaces/studiobaladovideo/"
              }
            ],
            [
              {
                texte: "Studio vidéo",
                lien: "https://studio.bib.umontreal.ca/espaces/studiovideo/"
              }
            ],
            [
              {
                texte: "Salles Accessibilité",
                lien: "/service-accessibilite/#acces-a-des-salles-de-travail-adaptees"
              }
            ]
          ]
        }
      ],
      adresse: [
        "Bibliothèque des lettres et sciences humaines",
        "Pavillon Samuel-Bronfman",
        "3000 rue Jean Brillant, Montréal, salle 1030"
      ],
      itineraire: "https://www.google.com/maps/place/Pavillon+Samuel-Bronfman,+3000+Jean+Brillant+St,+Montreal,+QC+H3T+1N7,+Canada/@45.499427,-73.616554,4251m/data=!3m1!1e3!4m6!3m5!1s0x4cc919f3c6b6c4fd:0x1783a82167c956!8m2!3d45.4994274!4d-73.6165537!16s%2Fg%2F1tftqq4m?hl=en&entry=ttu&g_ep=EgoyMDI1MDQwOC4wIKXMDSoASAFQAw%3D%3D",
      nousJoindre: [
        {
          p: "Comptoir de prêt, réserve de cours"
        },
        {
          ul: [
            "514 343-7336",
            [
              {
                texte: "pret-lsh@bib.umontreal.ca",
                lien: "mailto:pret-lsh@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            "514 343-6111, poste 2655",
            [
              {
                texte: "lsh@bib.umontreal.ca",
                lien: "mailto:lsh@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#lsh",
        fleche: true
      }
    }
  },
  {
    id: "livres-rares-et-collections-speciales",
    name: "Bibliothèque des livres rares et collections spéciales",
    aliases: [
      "BLRCS",
      "LRCS"
    ],
    zone: "library",
    addr: "Pavillon Samuel-Bronfman, 3000 rue Jean-Brillant, salle 4030",
    pavillon: "Pavillon Samuel-Bronfman",
    lat: 45.499627,
    lng: -73.616354,
    codeBib: "cs",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 39836",
        email: "livresrares@bib.umontreal.ca"
      }
    ],
    spaces: [
      {
        label: "Salle de séminaire",
        url: "https://calendrier.bib.umontreal.ca/space/34702"
      }
    ],
    staffFragment: "lrcs",
    fiche: {
      id: "lrcs",
      titre: "Livres rares et collections spéciales",
      espaces: [
        {
          ul: [
            [
              {
                texte: "Salle de séminaire",
                lien: "https://calendrier.bib.umontreal.ca/space/34702"
              }
            ]
          ]
        }
      ],
      adresse: [
        "Bibliothèque des livres rares et collections spéciales",
        "Pavillon Samuel-Bronfman",
        "3000 rue Jean Brillant, salle 4030"
      ],
      itineraire: "https://www.google.com/maps?ll=45.499427,-73.616554&z=15&t=m&hl=fr-FR&gl=US&mapclient=embed&q=Pavillon+Samuel-Bronfman+3000+Jean+Brillant+St+Montreal,+QC+H3T+1N7",
      nousJoindre: [
        {
          p: "Accueil et prêt"
        },
        {
          ul: [
            "514 343-6111, poste 39836",
            [
              {
                texte: "livresrares@bib.umontreal.ca",
                lien: "mailto:livresrares@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#lrcs",
        fleche: true
      }
    }
  },
  {
    id: "marguerite-d-youville",
    name: "Bibliothèque Marguerite-d'Youville",
    aliases: [
      "MY"
    ],
    zone: "library",
    addr: "Pavillon Marguerite-d'Youville, 2375 chemin de la Côte-Sainte-Catherine, salle 2120",
    pavillon: "Pavillon Marguerite-d'Youville",
    lat: 45.509365,
    lng: -73.618392,
    codeBib: "pa",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 1895",
        email: "pret-my@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        email: "marguerite-d-youville@bib.umontreal.ca"
      }
    ],
    staffFragment: "marguerite-d-youville",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Salle nécessitant une approbation",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "marguerite-d-youville",
      titre: "Marguerite-d'Youville",
      espaces: false,
      adresse: [
        "Bibliothèque Marguerite-d'Youville",
        "Pavillon Marguerite-d'Youville",
        "2375, chemin de la Côte-Sainte-Catherine, salle 2120"
      ],
      itineraire: "https://www.google.com/maps?ll=45.509365,-73.618392&z=15&t=m&hl=en&gl=US&mapclient=embed&cid=14455154458948229137",
      nousJoindre: [
        {
          p: "Accueil et prêt"
        },
        {
          ul: [
            "514 343-6111, poste 1895",
            [
              {
                texte: "pret-my@bib.umontreal.ca",
                lien: "mailto:pret-my@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            [
              {
                texte: "marguerite-d-youville@bib.umontreal.ca",
                lien: "mailto:marguerite-d-youville@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#marguerite-d-youville",
        fleche: false
      }
    }
  },
  {
    id: "mathematiques-et-informatique",
    name: "Bibliothèque de mathématiques et informatique",
    aliases: [
      "Math-info",
      "Mathinfo"
    ],
    zone: "library",
    addr: "Pavillon André-Aisenstadt, 2920 chemin de la Tour, salle 2405",
    pavillon: "Pavillon André-Aisenstadt",
    lat: 45.501009,
    lng: -73.615778,
    codeBib: "mi",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 1982",
        email: "pret-mi@bib.umontreal.ca"
      },
      {
        label: "Référence",
        email: "sciences@bib.umontreal.ca"
      }
    ],
    spaces: [
      {
        label: "Atelier de fabrication",
        url: "https://studio.bib.umontreal.ca/espaces/ateliers/"
      },
      {
        label: "Studio balado audio",
        url: "https://studio.bib.umontreal.ca/espaces/studiosbaladoaudio/"
      },
      {
        label: "Studio d'innovation et de créativité"
      }
    ],
    staffFragment: "math-info",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Salle nécessitant une approbation",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "math-info",
      titre: "Mathématiques et informatique",
      espaces: [
        {
          ul: [
            [
              {
                texte: "Atelier de fabrication",
                lien: "https://studio.bib.umontreal.ca/espaces/ateliers/"
              }
            ],
            [
              {
                texte: "Studio balado audio",
                lien: "https://studio.bib.umontreal.ca/espaces/studiosbaladoaudio/"
              }
            ],
            "Studio d'innovation et de créativité"
          ]
        }
      ],
      adresse: [
        "Bibliothèque de mathématiques et informatique",
        "Pavillon André-Aisenstadt",
        "2920, chemin de la tour, salle 2405"
      ],
      itineraire: "https://www.google.com/maps/place/UdeM+%E2%80%93+Andr%C3%A9-Aisenstadt+Pavillon/@45.501009,-73.615778,15z/data=!4m6!3m5!1s0x4cc919f308df50f9:0x1c5cdca60001c62e!8m2!3d45.5010087!4d-73.6157778!16s%2Fg%2F11b6v92qlg?hl=en&entry=ttu&g_ep=EgoyMDI1MDQxNC4xIKXMDSoASAFQAw%3D%3D",
      nousJoindre: [
        {
          p: "Accueil et prêt"
        },
        {
          ul: [
            "514 343-6111, poste 1982",
            [
              {
                texte: "pret-mi@bib.umontreal.ca",
                lien: "mailto:pret-mi@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Référence"
        },
        {
          ul: [
            [
              {
                texte: "sciences@bib.umontreal.ca",
                lien: "mailto:sciences@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#math-info",
        fleche: true
      }
    }
  },
  {
    id: "medecine-veterinaire",
    name: "Bibliothèque de médecine vétérinaire",
    zone: "library",
    addr: "Campus de Saint-Hyacinthe, 1500 rue des Vétérinaires, salle 1541",
    pavillon: "Campus de Saint-Hyacinthe",
    lat: 45.620922,
    lng: -72.9650018,
    codeBib: "mv",
    contact: [
      {
        label: "Comptoir de prêt",
        phone: "450 773-8521, poste 8136 ou 514 343-6111, poste 8136",
        email: "pret-mv@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "450 773-8521, poste 8368",
        email: "medecine-veterinaire@bib.umontreal.ca"
      }
    ],
    staffFragment: "medecine-veterinaire",
    reservations: [
      {
        label: "Salle de travail individuelle",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "medecine-veterinaire",
      titre: "Médecine vétérinaire",
      adresse: [
        "Bibliothèque de médecine vétérinaire",
        "Campus de St-Hyacinthe",
        "1500, rue des vétérinaires, salle 1541"
      ],
      itineraire: "https://www.google.com/maps/place/1500+Rue+des+V%C3%A9t%C3%A9rinaires/@45.620922,-72.9650018,21z/data=!4m7!3m6!1s0x4cc84e75a6001beb:0x409b244035818f6a!4b1!8m2!3d45.6209162!4d-72.9648717!16s%2Fg%2F11b8txmz30?hl=en&entry=ttu&g_ep=EgoyMDI1MDQxNC4xIKXMDSoASAFQAw%3D%3D",
      nousJoindre: [
        {
          p: "Comptoir de prêt"
        },
        {
          ul: [
            "450 773-8521, poste 8136 ou 514 343-6111, poste 8136",
            [
              {
                texte: "pret-mv@bib.umontreal.ca",
                lien: "mailto:pret-mv@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            "450 773-8521, poste 8368",
            [
              {
                texte: "medecine-veterinaire@bib.umontreal.ca",
                lien: "mailto:medecine-veterinaire@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#medecine-veterinaire",
        fleche: true
      }
    }
  },
  {
    id: "musique",
    name: "Bibliothèque de musique",
    zone: "library",
    addr: "Pavillon de la Faculté de musique, 200 avenue Vincent-d'Indy, salle B-287",
    pavillon: "Pavillon de la Faculté de musique",
    lat: 45.509273,
    lng: -73.60857,
    codeBib: "mu",
    contact: [
      {
        label: "Accueil",
        phone: "514 343-6432"
      },
      {
        label: "Comptoir de prêt",
        phone: "514 343-6111, poste 39838",
        email: "pret-musique@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "514 343-6111, poste 4702",
        email: "musique@bib.umontreal.ca"
      }
    ],
    staffFragment: "musique",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "musique",
      titre: "Musique",
      espaces: false,
      adresse: [
        "Bibliothèque de musique",
        "Pavillon de la faculté de musique",
        "200, avenue Vincent d'Indy,  salle B-287"
      ],
      itineraire: "https://www.google.com/maps?ll=45.509273,-73.60857&z=15&t=m&hl=en&gl=US&mapclient=embed&q=Pavillon+de+la+Faculte+de+Musique+Av.+Vincent-D%27Indy+Outremont,+QC+H2V+2T2",
      nousJoindre: [
        {
          p: "Accueil"
        },
        {
          ul: [
            [
              {
                texte: "514 343-6432",
                lien: "tel:+15143436432"
              }
            ]
          ]
        },
        {
          p: "Comptoir de prêt"
        },
        {
          ul: [
            "514 343-6111, poste 39838",
            [
              {
                texte: "pret-musique@bib.umontreal.ca",
                lien: "mailto:pret-musique@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            "514 343-6111, poste 4702",
            [
              {
                texte: "musique@bib.umontreal.ca",
                lien: "mailto:musique@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#musique",
        fleche: true
      }
    }
  },
  {
    id: "parc",
    name: "Bibliothèque du Parc",
    aliases: [
      "7077",
      "Antenne paramédicale"
    ],
    zone: "library",
    addr: "Pavillon 7077, avenue du Parc, salle U-529",
    pavillon: "Pavillon 7077, avenue du Parc",
    lat: 45.529968,
    lng: -73.620079,
    codeBib: "antenne-paramedicale",
    contact: [
      {
        label: "Accueil et prêt",
        phone: "514 343-6111, poste 39833",
        email: "7077duParc@bib.umontreal.ca"
      }
    ],
    staffFragment: "parc",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "parc",
      titre: "Parc",
      espaces: false,
      adresse: [
        "Bibliothèque du Parc",
        "Pavillon 7077, avenue du Parc",
        "7077, avenue du Parc, salle U-529"
      ],
      itineraire: "https://www.google.com/maps/place/7077+Park+Ave,+Montreal,+QC+H3N+1X7,+Canada/@45.529968,-73.620079,15z/data=!4m6!3m5!1s0x4cc9190c5700fc5d:0x866f7fddd5daea6b!8m2!3d45.5299681!4d-73.6200789!16s%2Fg%2F11csh49b37?hl=en&entry=ttu&g_ep=EgoyMDI1MDQxNC4xIKXMDSoASAFQAw%3D%3D",
      nousJoindre: [
        {
          p: "Accueil et prêt : 514 343-6111, poste 39833"
        },
        {
          p: [
            {
              texte: "7077duParc@bib.umontreal.ca",
              lien: "mailto:7077duParc@bib.umontreal.ca"
            }
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#parc",
        fleche: true
      }
    }
  },
  {
    id: "sante",
    name: "Bibliothèque de la santé",
    zone: "library",
    addr: "Pavillon Roger-Gaudry, 2900 boul. Édouard-Montpetit, 6e étage, salle L-623",
    pavillon: "Pavillon Roger-Gaudry",
    lat: 45.50273,
    lng: -73.615076,
    codeBib: "sa",
    contact: [
      {
        label: "Comptoir de prêt",
        phone: "514 343-6111, poste 3544",
        email: "pret-sante@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "514 343-6111, poste 6826",
        email: "sante@bib.umontreal.ca"
      }
    ],
    staffFragment: "sante",
    reservations: [
      {
        label: "Salle de travail individuelle",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      }
    ],
    fiche: {
      id: "sante",
      titre: "Santé",
      espaces: false,
      adresse: [
        "Bibliothèque de la santé",
        "Pavillon Roger Gaudry",
        "2900, boul. Édouard-Montpetit, 6e étage, salle L-623"
      ],
      itineraire: "https://www.google.com/maps/place/University+of+Montreal+-+Roger-Gaudry+Building/@45.50273,-73.615076,15z/data=!4m6!3m5!1s0x4cc919f327eaaaab:0x35829fb5993f11a6!8m2!3d45.5027303!4d-73.6150758!16s%2Fg%2F11c42_t8fq?hl=en&entry=ttu&g_ep=EgoyMDI1MDQxNC4xIKXMDSoASAFQAw%3D%3D",
      nousJoindre: [
        {
          p: "Comptoir de prêt :"
        },
        {
          ul: [
            "514 343-6111, poste 3544",
            [
              {
                texte: "pret-sante@bib.umontreal.ca",
                lien: "mailto:pret-sante@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence :"
        },
        {
          ul: [
            "514 343-6111, poste 6826",
            [
              {
                texte: "sante@bib.umontreal.ca",
                lien: "mailto:sante@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#sante",
        fleche: true
      }
    }
  },
  {
    id: "therese-gouin-decarie",
    name: "Bibliothèque Thérèse-Gouin-Décarie",
    aliases: [
      "TGD",
      "ÉPC"
    ],
    zone: "library",
    addr: "Pavillon Marie-Victorin, 90 avenue Vincent-d'Indy, salle G-205",
    pavillon: "Pavillon Marie-Victorin",
    lat: 45.510687,
    lng: -73.61158,
    codeBib: "ed",
    contact: [
      {
        label: "Accueil",
        phone: "514 343-7242"
      },
      {
        label: "Comptoir de prêt",
        phone: "514 343-6111, poste 1705",
        email: "pret-tgd@bib.umontreal.ca"
      },
      {
        label: "Bureau de référence",
        phone: "514 343-6111, poste 1706",
        email: "refepcaml@bib.umontreal.ca"
      }
    ],
    spaces: [
      {
        label: "Didacthèque",
        url: "https://calendrier.bib.umontreal.ca/space/19189"
      },
      {
        label: "Atelier de fabrication",
        url: "https://studio.bib.umontreal.ca/espaces/ateliers/"
      },
      {
        label: "Studio vidéo",
        url: "https://studio.bib.umontreal.ca/espaces/studiovideo/"
      },
      {
        label: "Cocon de micro-sieste",
        url: "https://calendrier.bib.umontreal.ca/space/23805"
      }
    ],
    staffFragment: "tgd",
    reservations: [
      {
        label: "Salle de travail en équipe",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Cabine",
        url: "https://calendrier.bib.umontreal.ca/r"
      },
      {
        label: "Didacthèque",
        url: "https://calendrier.bib.umontreal.ca/space/19189"
      },
      {
        label: "Cocon de micro-sieste",
        url: "https://calendrier.bib.umontreal.ca/space/23805"
      }
    ],
    fiche: {
      id: "tgd",
      titre: "Thérèse-Gouin-Décarie",
      espaces: [
        {
          ul: [
            [
              {
                texte: "Didacthèque",
                lien: "https://calendrier.bib.umontreal.ca/space/19189"
              }
            ],
            [
              {
                texte: "Atelier de fabrication",
                lien: "https://studio.bib.umontreal.ca/espaces/ateliers/"
              }
            ],
            [
              {
                texte: "Studio vidéo",
                lien: "https://studio.bib.umontreal.ca/espaces/studiovideo/"
              }
            ],
            [
              {
                texte: "Cocon de micro-sieste",
                lien: "https://calendrier.bib.umontreal.ca/space/23805"
              }
            ]
          ]
        }
      ],
      adresse: [
        "Bibliothèque Thérèse-Gouin-Décarie",
        "Pavillon Marie-Victorin",
        "90, avenue Vincent-d'Indy, salle G-205"
      ],
      itineraire: "https://www.google.com/maps?ll=45.510687,-73.61158&z=15&t=m&hl=en&gl=US&mapclient=embed&cid=10344974121678518049",
      nousJoindre: [
        {
          p: "Accueil"
        },
        {
          ul: [
            [
              {
                texte: "514 343-7242",
                lien: "tel:+15143437242"
              }
            ]
          ]
        },
        {
          p: "Comptoir de prêt"
        },
        {
          ul: [
            "514 343-6111, poste 1705",
            [
              {
                texte: "pret-tgd@bib.umontreal.ca",
                lien: "mailto:pret-tgd@bib.umontreal.ca"
              }
            ]
          ]
        },
        {
          p: "Bureau de référence"
        },
        {
          ul: [
            "514 343-6111, poste 1706",
            [
              {
                texte: "tgd@bib.umontreal.ca",
                lien: "mailto:tgd@bib.umontreal.ca"
              }
            ]
          ]
        }
      ],
      repertoire: {
        lien: "/nous-joindre/notre-equipe/#tgd",
        fleche: true
      }
    }
  },
  {
    id: "jardin-botanique",
    name: "Point de service Jardin botanique",
    aliases: [
      "Espace pour la vie"
    ],
    zone: "points-service",
    addr: "4101 rue Sherbrooke Est, Montréal",
    lat: 45.5569529,
    lng: -73.5565181,
    contact: [
      {
        label: "Téléphone",
        phone: "514 872-1824"
      }
    ],
    note: "Horaire distinct de celui de l'UdeM, géré par Espace pour la vie. Vérifiez avant de vous déplacer.",
    noteLink: {
      label: "Horaire de la bibliothèque du Jardin botanique",
      url: "https://espacepourlavie.ca/bibliotheque-du-jardin-botanique"
    },
    fiche: {
      id: "jardin-botanique",
      titre: "Point de service : Jardin botanique",
      espaces: [
        {
          alerte: [
            {
              p: "Ce point de service permet de récupérer des documents ou de les retourner."
            },
            {
              p: "Vous pouvez joindre la Bibliothèque du Jardin botanique au 514 872-1824."
            },
            {
              p: [
                "Nous vous recommandons de vérifier ",
                {
                  texte: "l'horaire de la bibliothèque",
                  lien: "https://espacepourlavie.ca/bibliotheque-du-jardin-botanique"
                },
                " avant de vous déplacer."
              ]
            }
          ]
        }
      ],
      adresse: [
        "Bibliothèque du Jardin botanique",
        "4101, rue Sherbrooke Est",
        "Montréal (Québec) H1X 2B2"
      ],
      itineraire: "https://www.google.com/maps/place/Espace+pour+la+Vie/@45.557078,-73.556274,3044m/data=!3m1!1e3!4m6!3m5!1s0x4cc91c092fa84805:0xe8af01db20d5846a!8m2!3d45.5568981!4d-73.5564454!16s%2Fm%2F0zmx8kx?hl=fr&entry=ttu&g_ep=EgoyMDI1MDQyMC4wIKXMDSoASAFQAw%3D%3D"
    }
  },
  {
    id: "brossard",
    name: "Point de service Brossard",
    zone: "points-service",
    addr: "2000 rue de l'Éclipse, Brossard",
    lat: 45.4471805,
    lng: -73.432246,
    note: "Permet de récupérer ou retourner des documents. Vérifiez l'horaire avant de vous déplacer.",
    fiche: {
      id: "brossard",
      titre: "Point de service : Brossard",
      espaces: [
        {
          alerte: [
            {
              p: "Ce point de service permet de récupérer des documents ou de les retourner."
            },
            {
              p: "Nous vous recommandons de vérifier l'horaire du point de service avant de vous déplacer."
            }
          ]
        }
      ],
      adresse: [
        "Point de service Brossard",
        "2000, rue de l’Éclipse",
        "Brossard (Québec) J4Z 0S2"
      ],
      itineraire: "https://www.google.com/maps/place/2000+R.+de+l'%C3%89clipse,+Brossard,+QC+J4Z+0S2/@45.4472216,-73.4343575,1064m/data=!3m2!1e3!4b1!4m6!3m5!1s0x4cc90f05b64ae619:0xc49194e396d285f1!8m2!3d45.4472179!4d-73.4317826!16s%2Fg%2F11ldtpkmh_?entry=ttu&g_ep=EgoyMDI1MTAxMy4wIKXMDSoASAFQAw%3D%3D"
    }
  },
  {
    id: "place-dupuis",
    name: "Point de service Place Dupuis",
    zone: "points-service",
    addr: "845 rue Sainte-Catherine Est, Montréal",
    lat: 45.5162259,
    lng: -73.559243,
    note: "Accès réservé aux personnes autorisées à la Faculté de médecine, Place Dupuis.",
    fiche: {
      id: "place-dupuis",
      titre: "Point de service : Place Dupuis",
      espaces: [
        {
          alerte: [
            {
              p: "L'accès au point de service de la Place Dupuis est réservé aux personnes autorisées à accéder aux locaux de la Faculté de médecine à Place Dupuis."
            }
          ]
        }
      ],
      adresse: [
        "Point de service : Place Dupuis",
        "845, rue Sainte-Catherine Est",
        "Montréal (Québec)  H2L 4L8"
      ],
      itineraire: "https://www.google.com/maps?rlz=1C1GCEU_frCA1110CA1110&um=1&ie=UTF-8&fb=1&gl=ca&sa=X&geocode=KZ2mj4ayG8lMMeakBvJ3Oq0v&daddr=Place+Dupuis,+845+Rue+Sainte-Catherine+E,+Montréal,+QC+H2L+4L8"
    }
  }
]

/** Ordre des fiches de /espaces/ et /nous-joindre/ (celui de bibliotheques.mdx) */
const ordreFiches = [
  "amenagement",
  "campus-de-laval",
  "droit",
  "hubert-reeves",
  "kinesiologie",
  "lettres-et-sciences-humaines",
  "livres-rares-et-collections-speciales",
  "marguerite-d-youville",
  "mathematiques-et-informatique",
  "medecine-veterinaire",
  "musique",
  "parc",
  "sante",
  "therese-gouin-decarie",
  "centre-de-conservation-lionel-groulx",
  "centre-de-conservation-101-boul-marcel-laurin",
  "brossard",
  "jardin-botanique",
  "place-dupuis"
]

export const lieuxAvecFiche = ordreFiches.map((id) => lieux.find((l) => l.id === id)!)

export const lieuParFiche = (idFiche: string) => lieux.find((l) => l.fiche?.id === idFiche)
export const lieuParCode = (code: string) => lieux.find((l) => l.codeBib === code)
