# Portfolio of the future

Personal portfolio of Laziz Raimqulov, told as a journey through a galaxy.

- **Story page** (`index.html`): six chapters (who, origin, toolkit, work, museum, contact) over a three.js galaxy that the camera flies through as you scroll. Press **P** to pilot a ship between project star systems; **Space** glides to the next chapter.
- **Museum** (`museum.html`): a walkable third-person photo gallery.
- **Contact form**: messages are stored in Firestore (`messages` collection).

Live: https://laziz-portfolio.web.app

## Editing content

Everything the site says lives in `js/data.js`: profile, contacts, timeline, skills, projects and gallery photos. Put images in `assets/` (`assets/me.jpg` for your photo, `assets/gallery/` for the museum).

## Run locally

ES modules need a server, so opening the file directly won't work:

```
python -m http.server 5500
```

then open http://localhost:5500 (VS Code Live Server works too).

## Deploy

```
firebase deploy --only hosting
```

`firestore.rules` only lets visitors create well-formed messages; deploy it with `firebase deploy --only firestore:rules`.

## Stack

HTML, CSS, JavaScript, three.js, Lenis (smooth scrolling) and Firebase (Hosting + Firestore). No build step.
