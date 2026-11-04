# Artist Search

A small Flask web app that wraps the [Spotify Web API](https://developer.spotify.com/documentation/web-api). Type in an artist's name and the page shows their follower count, genres, ten most popular tracks, and full discography with per-album track listings.

Project by Aditya Bhati.

## Features

- **Follower count** formatted with thousands separators.
- **Genres** the artist is tagged with on Spotify.
- **Top 10 tracks** with duration and Spotify popularity score.
- **Discography** as collapsible accordions, one per album/single, listing every track and its length.
- Single-page UI rendered with Jinja2 templates and plain CSS/JS. No frontend framework.

## How it works

1. On each search, the server requests an access token from Spotify using the [Client Credentials flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow).
2. The artist name is passed to the `/v1/search` endpoint (`type=artist`, `limit=1`) to resolve the most relevant artist and their ID.
3. That ID is used to call `/v1/artists/{id}/top-tracks` and `/v1/artists/{id}/albums`, then `/v1/albums/{id}` for each album's tracks.
4. The results are shaped into plain strings, lists, and dicts and rendered into `Templates/homepage.html`.

## Project structure

```
ArtistSearch/
├── artistSearch.py        # Spotify API helpers + Flask routes
├── Templates/
│   ├── foundation.html    # Base layout (loads the stylesheet, defines blocks)
│   └── homepage.html      # Search form and results
├── Static/
│   └── CSS/main.css       # Styling
├── .env                   # Spotify credentials (not committed)
└── README.md
```

## Setup

### Prerequisites

- Python 3.12 or newer (the code uses nested same-quote f-strings, which older versions reject).
- A Spotify Developer app. Create one at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) to get a Client ID and Client Secret.

### Install

```bash
git clone <this-repo>
cd ArtistSearch
python3 -m venv venv
source venv/bin/activate
pip install flask requests python-dotenv
```

### Configure

Create a `.env` file in the project root:

```
CLIENT_ID=your_spotify_client_id
CLIENT_SECRET=your_spotify_client_secret
```

### Run

```bash
python artistSearch.py
```

Open http://127.0.0.1:5000 in your browser, enter an artist's name, and press Enter.

## Notes and limitations

- Searches use `limit=1`, so if several artists share a name you get whichever Spotify ranks highest.
- Every search fetches a fresh access token and makes one request per album, so artists with large discographies take a few seconds to load.
- Submitting an empty search shows a prompt to enter a name. Searching for an artist that doesn't exist currently raises a server error rather than a friendly message.
- The app runs Flask's development server with `debug=True`. It is intended for local use, not deployment.
