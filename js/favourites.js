"use strict";

// FAVOURITES: browser-local watchlist storage, card buttons and Watchlist page.
var watchlistStorageKey = "haoMovieEmpireWatchlist";

// Read the movie IDs saved in this browser's local watchlist.
function readWatchlist() {
    var saved = localStorage.getItem(watchlistStorageKey);
    if (!saved) {
        return [];
    }
    var watchlist = JSON.parse(saved);
    if (!Array.isArray(watchlist) || watchlist.some(function(id) { return typeof id !== "string"; })) {
        throw new Error("The saved watchlist has an invalid format.");
    }
    return watchlist;
}

// Reflect the saved watchlist state on every movie card currently on the page.
function updateWatchlistButtons() {
    try {
        var watchlist = readWatchlist();
        document.querySelectorAll(".watchlist-toggle").forEach(function(button) {
            var isSaved = watchlist.indexOf(button.dataset.movieId) !== -1;
            button.disabled = false;
            button.title = "";
            button.textContent = isSaved ? "Remove from favourites" : "Add to favourites";
            button.setAttribute("aria-pressed", String(isSaved));
        });
    } catch (error) {
        document.querySelectorAll(".watchlist-toggle").forEach(function(button) {
            button.disabled = true;
            button.title = "Favourites are unavailable: " + error.message;
        });
    }
}

// Add or remove one movie ID and refresh every card control.
function toggleWatchlistMovie(movieId) {
    var watchlist = readWatchlist();
    var position = watchlist.indexOf(movieId);
    if (position === -1) {
        watchlist.push(movieId);
    } else {
        watchlist.splice(position, 1);
    }
    localStorage.setItem(watchlistStorageKey, JSON.stringify(watchlist));
    updateWatchlistButtons();
    return position === -1;
}

// Render this browser's saved favourites in the catalogue's current order.
function renderWatchlist() {
    var list = document.getElementById("watchlistMovies");
    if (!list) {
        return;
    }
    var status = document.getElementById("watchlistStatus");
    list.textContent = "";
    status.textContent = "Loading your local favourites…";
    Promise.all([readMovies(), Promise.resolve().then(readWatchlist)]).then(function(values) {
        var movies = values[0];
        var watchlist = values[1];
        var savedMovies = watchlist.map(function(id) {
            return movies.find(function(movie) { return movie.id === id; });
        }).filter(Boolean);
        if (!savedMovies.length) {
            status.textContent = watchlist.length
                ? "Your saved movies are no longer in the current fortnightly line-up."
                : "Your favourites list is empty. Add movies from the Movies or Recommendations page.";
            return;
        }
        savedMovies.forEach(function(movie) {
            list.appendChild(makeMovieCard(movie));
        });
        updateWatchlistButtons();
        status.textContent = savedMovies.length + " movie" + (savedMovies.length === 1 ? "" : "s")
            + " in your local favourites.";
    }).catch(function(error) {
        status.textContent = "Your favourites could not be loaded. " + error.message;
    });
}

// Delegate card actions because movie cards are created dynamically.
document.addEventListener("click", function(event) {
    var button = event.target.closest(".watchlist-toggle");
    if (!button) {
        return;
    }
    var status = document.getElementById("movieStatus")
        || document.getElementById("watchlistStatus")
        || document.getElementById("recommendStatus");
    var movie = {
        id: button.dataset.movieId,
        title: button.dataset.movieTitle,
        genre: button.dataset.movieGenre
    };
    try {
        var added = toggleWatchlistMovie(movie.id);
        var countMessage = "";
        if (added) {
            try {
                recordMovieInterest(movie, "favourites");
            } catch (error) {
                countMessage = " The favourite was saved, but its tally could not be updated: " + error.message;
            }
        }
        if (document.getElementById("watchlistMovies")) {
            renderWatchlist();
        }
        if (status) {
            status.textContent = added
                ? movie.title + " added to your local favourites." + countMessage
                : movie.title + " removed from your local favourites.";
        }
    } catch (error) {
        if (status) {
            status.textContent = "Your favourites could not be updated. " + error.message;
        }
    }
});

document.addEventListener("DOMContentLoaded", function() {
    updateWatchlistButtons();
    renderWatchlist();
});
