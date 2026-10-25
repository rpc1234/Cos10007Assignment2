# Cos10007Assignment2
This is an individual assignment. The goal is to apply your knowledge of HTML5 and CSS3 to design, develop, and test a small but complete website for a real-world scenario. JavaScript will be used to validate user input data before it is submitted to the server for processing. 
Hao's Movie Empire - COS10005 Assignment 2

Website structure
- index.html: movie discovery home page.
- movies.html: loads the movie list from xml/movies.xml when Show movies is clicked.

- recommend.html: recommends films using any combination of optional current movie
  genre, age-group and viewing-preference filters; selected filters are combined, and
  genre choices load from the movie XML and can be changed fortnightly by editing the XML emulating a real website, extra movie have been added and are shown as coming soon.

- register.html: validated registration form with a fake local database (see admin) and a separate Mercury upload test button.

- booking.html: booking form with price calculation, conditional payment fields,
  local demo saving and a separate Mercury upload test button.

- watchlist.html: view and remove favourite movies, saved in this browser (see admin).

- Ad placements: one or two themed sponsor spots appear across the customer pages.
  Nuka-Cola and Vault-Tec are treated as fictional in-world sponsors. The Home hero
  features a Kent period advert as a 1950s sponsor spotlight. Register and Booking
  use different period tobacco adverts as old timey set dressing. Recommendations
  and Favourites each feature a different period medicine advert.
 - admin.html: password-gated local demo tables (password is 12345) for saved form entries and movie-interest counts. Generated using the in built AI agents with only prompt help from me, as a way of simulating a backend where in real life the site owner could go and check everything. I didn't use SQL and its only saved locally to the browser, so resets on each refers of the pages. But if you go through sequentially, and Add favourites, suggestions, accounts, and bookings, they should all show.

- css/style.css: Style Sheet

- js/script.js: shared movie data, recommendations and form behaviours. While generating the favourites and admin sections, the JS file because massive, i know we need to understand what everything does, and i will try and order it manually and automatically, but im honestly not sure what its done at this point, sorta went rouge. 

- js/favourites.js: browser-local watchlist and movie-card favourite controls, separated as it wasn't really my own work, but i tried to have the AI show me what it was doing as it did it. By this point i had already implemented the Admin page, so unfortunately they go hand in hand now, relying on each others data. 

- js/admin.js: Admin-only access, mock back end system to show submission history and movie-interest table behaviours, separated as it wasn't my own work, but thought it would be cool to have to add realism, unfortunately some code leaks into the main JS file for counters and such. 

- xml/movies.xml: movie details, prices and session times, copied template and scripting from week 11 Labs, then added necessary extra sections.

- images/: movie poster copyright of their respective studios and sponsor advert artwork some random old ads plus two i thinks you get a laugh out of. 

Image credits
- index.html featured image: images/kent_ad.webp, supplied by Robert
  Clohesy, Owned by the R.J Morris Tobacco Company
- Movie posters referenced in xml/movies.xml were supplied by Robert Clohesy for
  this assignment. 
	- Mary Poppins and Bed Knobs and Broom Sticks remain Intellectual Property of the Walt Disney Corporation
	- The Wizard of Oz remain Intellectual Property of the Metro-Goldwyn-Mayer
	- The Man Who Knew too Much remain Intellectual Property of the Alfred Hitchcock and Paramount Pictures
	- Silence of the Lambs remain Intellectual Property of the Strong Heart Productions
	_ The Conjuring remain Intellectual Property of the Warner Brother, New Line Cinema, The Safran Company and Evergreen Media Group.

How to run
Serve this folder from a web server and open index.html. The movie data uses fetch(),
so the pages do not work correctly when opened directly from a file:// URL.

Mercury link
https://mercury.swin.edu.au/cos10005/s106886400/assignment2/index.html

GitHub repository
https://github.com/rpc1234/Cos10007Assignment2/

JavaScript validation and behaviour
- Registration checks username length and allowed characters, email format, phone
  digits and length, password length and character groups, password confirmation,
  male/female selection, at least one preferred genre from a checkbox dropdown, and
  country/region. Selected genres are joined into one comma-separated `genres` field
  so the Mercury test table displays every selection together. Errors are shown
  before submission.

- Booking checks required details, email and phone formats, that the session is not
  in the past, a positive ticket quantity, payment details and billing email.

- The selected movie is passed to booking.html as a movie ID in the query string.
  The booking page loads the movie XML and preselects that ID; the user can change it.

- Registration, booking, recommendation and movie suggestion forms save demo answers
  in this browser's local storage. The Admin page uses the demo access code `12345`;
  it is not secure, and saved entries are not shared with other browsers or devices.
  Fake registration passwords, card numbers and voucher values are saved in the local
  demo table; never enter real credentials or payment details.

- Favourites are saved as movie IDs in browser local storage and remain available
  across the site's pages in that browser. The Watchlist page displays and removes
  them; Admin tallies how often each movie was added to favourites and appeared in
  recommendation results, includes saved customer movie suggestions, flags movies
  with favourite/recommendation overlap, and shows current watchlist membership.
  Suggestions with a title matching the catalogue are grouped with that movie;
  others are shown as separate rows. Title and genre snapshots keep past-line-up
  interest visible after the movie XML is updated. Counts are local to this browser.
  There is no customer login, so counts cannot be attributed to people or combined
  across browsers/devices.

- Movie, ticket type and quantity update the booking cost. Payment radio buttons
  show either voucher or card fields. The billing email checkbox copies the booking
  email and keeps it in sync while selected.
- Recommendations allow genre, age group and viewing preference to be selected
  independently or combined. At least one filter is required; every selected filter
  narrows the result set. Child selections show G-rated movies, Teen shows G/PG and
  Adult shows all current ratings. Recommendations are limited to the top three
  matching movies in catalogue order.

Known limitations
- The red Mercury Upload Test buttons POST form values to
  http://mercury.swin.edu.au/it000000/cos10005/formtest.php. The Mercury form test
  endpoint displays submitted fields; it does not save them, create accounts or
  process payments. Regular form submissions are saved only in this browser.

- Movie suggestions also POST to the Mercury form test endpoint; suggestions are
  displayed by the test server and are not saved for future line-ups. The suggestion
  form's previous-title dropdown shows unique suggestions from the last seven days
  in this browser. Its options expire after seven days; older entries remain in the
  local Admin history.
