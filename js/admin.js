"use strict";

// ADMIN TAB ONLY: submission history, interest tallies and Admin table rendering.
// Display locally stored submissions only after the demo access code is entered.
function bindAdminPage() {
    var form = document.getElementById("adminLoginForm");
    if (!form) {
        return;
    }
    var status = document.getElementById("adminStatus");
    var results = document.getElementById("adminResults");
    form.addEventListener("submit", function(event) {
        event.preventDefault();
        results.hidden = true;
        if (form.elements.password.value !== "12345") {
            status.textContent = "That demo access code is incorrect.";
            return;
        }
        try {
            var submissions = readSavedSubmissions();
            var rows = document.getElementById("adminSubmissionRows");
            rows.textContent = "";
            submissions.slice().reverse().forEach(function(submission) {
                var row = document.createElement("tr");
                var dateCell = document.createElement("td");
                dateCell.textContent = new Date(submission.submittedAt).toLocaleString();
                var typeCell = document.createElement("td");
                typeCell.textContent = submission.formType;
                var answersCell = document.createElement("td");
                Object.keys(submission.answers).forEach(function(name) {
                    var answer = document.createElement("p");
                    answer.className = "admin-answer";
                    answer.textContent = name + ": " + submission.answers[name];
                    answersCell.appendChild(answer);
                });
                row.appendChild(dateCell);
                row.appendChild(typeCell);
                row.appendChild(answersCell);
                rows.appendChild(row);
            });
            results.hidden = false;
            status.textContent = submissions.length
                ? submissions.length + " locally saved form entr" + (submissions.length === 1 ? "y." : "ies.")
                : "No form entries have been saved in this browser yet.";
            var watchlistResults = document.getElementById("adminWatchlistResults");
            var watchlistRows = document.getElementById("adminWatchlistRows");
            var watchlistStatus = document.getElementById("adminWatchlistStatus");
            watchlistRows.textContent = "";
            watchlistStatus.textContent = "Loading local movie-interest counts…";
            readMovies().then(function(movies) {
                var watchlist = readWatchlist();
                var interest = readMovieInterest();
                var suggestions = {};
                submissions.forEach(function(submission) {
                    if (submission.formType !== "Movie suggestion") {
                        return;
                    }
                    var title = String(submission.answers.movieTitle || "").trim();
                    if (!title) {
                        return;
                    }
                    var key = title.toLocaleLowerCase();
                    if (!suggestions[key]) {
                        suggestions[key] = {
                            title: title,
                            genre: String(submission.answers.movieGenre || "").trim(),
                            count: 0
                        };
                    }
                    suggestions[key].count += 1;
                });
                var overlaps = 0;
                var displayedSuggestions = {};
                var renderedRows = 0;
                var movieIds = movies.map(function(movie) { return movie.id; })
                    .concat(Object.keys(interest), watchlist)
                    .filter(function(id, index, allIds) { return allIds.indexOf(id) === index; });
                movieIds.forEach(function(movieId) {
                    var movie = movies.find(function(item) { return item.id === movieId; });
                    var counts = interest[movieId] || { favourites: 0, recommendations: 0 };
                    var title = movie ? movie.title : (counts.title || movieId);
                    var suggestionKey = title.trim().toLocaleLowerCase();
                    var suggestion = suggestions[suggestionKey];
                    var favouriteCount = Math.max(
                        Number(counts.favourites) || 0,
                        watchlist.indexOf(movieId) !== -1 ? 1 : 0
                    );
                    var recommendationCount = Number(counts.recommendations) || 0;
                    if (!favouriteCount && !recommendationCount && !suggestion) {
                        return;
                    }
                    var overlap = favouriteCount > 0 && recommendationCount > 0;
                    if (overlap) {
                        overlaps += 1;
                    }
                    appendMovieInterestRow([
                        title,
                        movie ? movie.genre : (counts.genre || (suggestion && suggestion.genre) || "Previous line-up"),
                        String(favouriteCount),
                        String(recommendationCount),
                        suggestion ? String(suggestion.count) : "0",
                        watchlist.indexOf(movieId) !== -1 ? "Yes" : "No",
                        overlap ? "Yes" : "No"
                    ]);
                    renderedRows += 1;
                    if (suggestion) {
                        displayedSuggestions[suggestionKey] = true;
                    }
                });
                Object.keys(suggestions).forEach(function(key) {
                    if (displayedSuggestions[key]) {
                        return;
                    }
                    var suggestion = suggestions[key];
                    appendMovieInterestRow([
                        suggestion.title,
                        suggestion.genre || "Not specified",
                        "0",
                        "0",
                        String(suggestion.count),
                        "No",
                        "No"
                    ]);
                    renderedRows += 1;
                });
                watchlistResults.hidden = false;
                watchlistStatus.textContent = renderedRows
                    ? overlaps + " movie" + (overlaps === 1 ? " has" : "s have")
                        + " both favourite and recommendation interest. Suggestion counts are included; all activity is local to this browser."
                    : "No movie interest or suggestions have been recorded in this browser yet.";
            }).catch(function(error) {
                watchlistResults.hidden = false;
                watchlistStatus.textContent = "Movie-interest counts could not be loaded. " + error.message;
            });
        } catch (error) {
            status.textContent = "Saved entries could not be read. " + error.message;
        }
    });
}

// Add one safely-rendered movie or suggestion row to the Admin interest table.
function appendMovieInterestRow(values) {
    var row = document.createElement("tr");
    values.forEach(function(value) {
        var cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
    });
    document.getElementById("adminWatchlistRows").appendChild(row);
}

document.addEventListener("DOMContentLoaded", bindAdminPage);
