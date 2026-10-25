"use strict";

// 1. SHARED DATA: cache the parsed catalogue and pending request for all page features.
var movieCache;
var movieRequest;
var submissionStorageKey = "haoMovieEmpireDemoSubmissions";
var movieInterestStorageKey = "haoMovieEmpireMovieInterest";

// Read local interest counters used to compare favourites with recommendations.
function readMovieInterest() {
    var saved = localStorage.getItem(movieInterestStorageKey);
    if (!saved) {
        return {};
    }
    var interest = JSON.parse(saved);
    if (!interest || Array.isArray(interest) || typeof interest !== "object") {
        throw new Error("Saved movie-interest counts have an invalid format.");
    }
    return interest;
}

// Increment one movie's favourite-add or recommendation count in this browser.
function recordMovieInterest(movie, interestType) {
    if (interestType !== "favourites" && interestType !== "recommendations") {
        throw new Error("Unknown movie-interest type.");
    }
    var interest = readMovieInterest();
    if (!interest[movie.id]) {
        interest[movie.id] = {
            title: movie.title,
            genre: movie.genre,
            favourites: 0,
            recommendations: 0
        };
    }
    interest[movie.id].title = movie.title;
    interest[movie.id].genre = movie.genre;
    interest[movie.id][interestType] += 1;
    localStorage.setItem(movieInterestStorageKey, JSON.stringify(interest));
}

// Read saved demo entries without hiding storage or data-format errors.
function readSavedSubmissions() {
    var saved = localStorage.getItem(submissionStorageKey);
    if (!saved) {
        return [];
    }
    var submissions = JSON.parse(saved);
    if (!Array.isArray(submissions)) {
        throw new Error("Saved demo entries have an invalid format.");
    }
    return submissions;
}

// Store non-sensitive demo answers locally; never retain passwords or card numbers.
function saveLocalSubmission(form, formType) {
    var answers = {};
    new FormData(form).forEach(function(value, name) {
        if (name !== "password" && name !== "confirmPassword" && name !== "cardNumber") {
            answers[name] = value;
        }
    });
    var submissions = readSavedSubmissions();
    submissions.push({
        formType: formType,
        submittedAt: new Date().toISOString(),
        answers: answers
    });
    localStorage.setItem(submissionStorageKey, JSON.stringify(submissions));
}

// Send a form to Mercury only when its separate red test button is selected.
function requestMercuryUpload(form) {
    if (!form.reportValidity()) {
        return;
    }
    form.dataset.mercuryUpload = "true";
    form.requestSubmit();
}

// Consume the one-shot Mercury request flag so later local saves stay local.
function consumeMercuryUpload(form) {
    var shouldUpload = form.dataset.mercuryUpload === "true";
    form.dataset.mercuryUpload = "false";
    return shouldUpload;
}

// Load and parse the movie catalogue before listing, recommendation or booking use.
function readMovies() {
    if (!movieRequest) {
        // Keep the in-flight request to prevent duplicate downloads.
        movieRequest = fetch("xml/movies.xml")
            .then(function(response) {
                // Convert network failures into a clear error for the calling page.
                if (!response.ok) {
                    throw new Error("Movie data request failed (HTTP " + response.status + ").");
                }
                return response.text();
            })
            .then(function(xmlText) {
                // Parse the response as XML and reject malformed data.
                var documentXml = new DOMParser().parseFromString(xmlText, "application/xml");
                if (documentXml.querySelector("parsererror")) {
                    throw new Error("The movie data is not valid XML.");
                }
                var nodes = Array.prototype.slice.call(documentXml.getElementsByTagName("movie"));
                // The assignment requires at least six movies in the catalogue.
                if (nodes.length < 6) {
                    throw new Error("At least six movies are required in the movie data.");
                }
                // Map each XML element to the fields used by listings and forms.
                movieCache = nodes.map(function(node) {
                    // Return an empty value for optional XML elements such as collection.
                    var read = function(tag) {
                        var element = node.getElementsByTagName(tag)[0];
                        return element ? element.textContent.trim() : "";
                    };
                    var screenings = node.getElementsByTagName("Available_screening_times")[0];
                    var imagePath = read("image");
                    var collections = Array.prototype.map.call(
                        node.getElementsByTagName("collection"),
                        function(collection) { return collection.textContent.trim(); }
                    );
                    return {
                        id: node.getAttribute("id"),
                        title: read("title"),
                        genre: read("genre"),
                        tags: Array.prototype.map.call(
                            node.getElementsByTagName("tag"),
                            function(tag) { return tag.textContent.trim(); }
                        ),
                        ageRating: read("ageRating"),
                        runningTime: read("runningTime"),
                        collection: collections.join(" · "),
                        description: read("short_description"),
                        image: imagePath,
                        isComingSoon: imagePath.toLowerCase().indexOf("comingsoon/") !== -1,
                        price: Number(read("ticket_price")),
                        times: screenings ? Array.prototype.map.call(
                            screenings.getElementsByTagName("time"),
                            function(time) { return time.textContent.trim(); }
                        ) : []
                    };
                });
                return movieCache;
            })
            .catch(function(error) {
                // Allow a later attempt to retry if loading or parsing fails.
                movieRequest = null;
                throw error;
            });
    }
    return movieRequest;
}

// 2. MOVIE DISPLAY: build movie cards and their shared detail helpers.
function makeMovieCard(movie) {
    var article = document.createElement("article");
    article.className = "movie-card";
    article.dataset.comingSoon = String(movie.isComingSoon);
    var posterFrame = document.createElement("div");
    posterFrame.className = "movie-card-poster";
    var image = document.createElement("img");
    image.src = movie.image;
    image.alt = "Poster for " + movie.title;
    posterFrame.appendChild(image);
    article.appendChild(posterFrame);

    var content = document.createElement("div");
    content.className = "movie-card-content";
    var heading = document.createElement("h2");
    heading.textContent = movie.title;
    content.appendChild(heading);

    var meta = document.createElement("p");
    meta.className = "movie-meta";
    meta.textContent = movie.genre + " · Rated " + movie.ageRating + " · " + movie.runningTime
        + (movie.collection ? " · " + movie.collection : "");
    content.appendChild(meta);

    if (movie.tags.length) {
        var tags = document.createElement("ul");
        tags.className = "movie-tags";
        tags.setAttribute("aria-label", "Movie highlights");
        movie.tags.forEach(function(label) {
            var tag = document.createElement("li");
            tag.textContent = label;
            tags.appendChild(tag);
        });
        content.appendChild(tags);
    }

    var summary = document.createElement("p");
    summary.textContent = movie.description;
    content.appendChild(summary);

    if (movie.isComingSoon) {
        var comingSoonNote = document.createElement("p");
        comingSoonNote.className = "coming-soon-note";
        comingSoonNote.textContent = "Coming soon — add it to your favourites for later.";
        content.appendChild(comingSoonNote);
    } else {
        var details = document.createElement("dl");
        addDetail(details, "Ticket price", formatMoney(movie.price));
        addDetail(details, "Sessions", movie.times.join(", "));
        content.appendChild(details);

        var bookingLink = document.createElement("a");
        bookingLink.className = "button";
        bookingLink.href = "booking.html?movie=" + encodeURIComponent(movie.id);
        bookingLink.textContent = "Book this movie";
        content.appendChild(bookingLink);
    }

    var watchlistButton = document.createElement("button");
    watchlistButton.className = "button watchlist-toggle";
    watchlistButton.type = "button";
    watchlistButton.dataset.movieId = movie.id;
    watchlistButton.dataset.movieTitle = movie.title;
    watchlistButton.dataset.movieGenre = movie.genre;
    watchlistButton.setAttribute("aria-pressed", "false");
    watchlistButton.textContent = "Add to favourites";
    content.appendChild(watchlistButton);
    article.appendChild(content);
    return article;
}

// Add a semantic term and value pair to a definition list.
function addDetail(list, label, value) {
    var term = document.createElement("dt");
    term.textContent = label;
    var description = document.createElement("dd");
    description.textContent = value;
    list.appendChild(term);
    list.appendChild(description);
}

// Format a numeric ticket amount as Australian-style dollar text.
function formatMoney(amount) {
    return "$" + amount.toFixed(2);
}

// Listing page: load and display the catalogue after the visitor requests it.
function renderMovieListing() {
    var list = document.getElementById("movieList");
    if (!list) {
        return;
    }
    var button = document.getElementById("loadMoviesButton");
    var status = document.getElementById("movieStatus");
    var advertButton = document.getElementById("showMoviesFromAd");
    if (advertButton) {
        advertButton.addEventListener("click", function() {
            button.click();
        });
    }
    button.addEventListener("click", function() {
        // Prevent duplicate clicks and provide immediate loading feedback.
        button.disabled = true;
        status.textContent = "Loading movie data…";
        readMovies().then(function(movies) {
            // Append cards in XML order, which is arranged by earliest screening time.
            var nowShowing = movies.filter(function(movie) { return !movie.isComingSoon; });
            nowShowing.forEach(function(movie) {
                list.appendChild(makeMovieCard(movie));
            });
            updateWatchlistButtons();
            list.hidden = false;
            status.textContent = "Showing " + nowShowing.length + " movies.";
        }).catch(function(error) {
            // Keep the error visible and let the user retry the request.
            status.textContent = "Movies could not be loaded. " + error.message;
            button.disabled = false;
        });
    });
}

// 3. RECOMMENDATIONS: match current and upcoming films to visitor filters.
var preferenceTags = {
    family: ["Fantasy", "Musical", "Adventure"],
    date: ["Musical", "Fantasy"],
    friends: ["Adventure", "Horror", "Thriller"],
    solo: ["Horror", "Thriller"]
};

function loadRecommendationGenres() {
    var select = document.getElementById("preferredGenre");
    var status = document.getElementById("recommendStatus");
    status.textContent = "Loading movie genres…";

    readMovies().then(function(movies) {
        var genres = movies.reduce(function(currentGenres, movie) {
            if (movie.genre && currentGenres.indexOf(movie.genre) === -1) {
                currentGenres.push(movie.genre);
            }
            return currentGenres;
        }, []);
        if (!genres.length) {
            throw new Error("No movie genres are available in the current catalogue.");
        }
        genres.forEach(function(genre) {
            var option = document.createElement("option");
            option.value = genre;
            option.textContent = genre;
            select.appendChild(option);
        });
        select.disabled = false;
        status.textContent = "";
    }).catch(function(error) {
        status.textContent = "Movie genres could not be loaded. " + error.message;
    });
}

function isSuitableForAge(movie, ageGroup) {
    if (ageGroup === "child") {
        return movie.ageRating === "G" || movie.ageRating === "PG";
    }
    if (ageGroup === "teen") {
        return movie.ageRating === "G" || movie.ageRating === "PG" || movie.ageRating === "M";
    }
    return !ageGroup || ageGroup === "adult";
}

function adultMoviePriority(movie) {
    var collection = movie.collection.toLowerCase();
    if (collection.indexOf("children") !== -1) {
        return 2;
    }
    if (collection.indexOf("classic") !== -1) {
        return 1;
    }
    if (movie.ageRating === "G" || movie.ageRating === "PG") {
        return 2;
    }
    return 0;
}

function showRecommendations(event) {
    var form = event.currentTarget;
    var selectedGenre = document.getElementById("preferredGenre").value;
    var ageGroup = document.getElementById("ageGroup").value;
    var preference = document.getElementById("viewingPreference").value;
    var results = document.getElementById("recommendResults");
    var status = document.getElementById("recommendStatus");
    var filterDescriptions = [];
    if (selectedGenre) filterDescriptions.push(selectedGenre + " genre");
    if (ageGroup) filterDescriptions.push(ageGroup + " age group");
    if (preference) filterDescriptions.push(preference + " viewing");
    if (!selectedGenre && !ageGroup && !preference) {
        event.preventDefault();
        results.textContent = "";
        status.textContent = "Choose at least one filter: genre, age group or viewing preference.";
        return;
    }
    event.preventDefault();
    results.textContent = "";
    status.textContent = "Finding movies that match your filters…";

    readMovies().then(function(movies) {
        var preferenceGenres = preference ? preferenceTags[preference] : [];
        var suitable = movies.filter(function(movie) {
            return (!selectedGenre || movie.genre.toLowerCase() === selectedGenre.toLowerCase())
                && isSuitableForAge(movie, ageGroup)
                && (!preference || preferenceGenres.indexOf(movie.genre) !== -1
                    || (preference === "family" && movie.collection.indexOf("Children's classic") !== -1));
        });
        if (ageGroup === "adult") {
            suitable.sort(function(first, second) {
                return adultMoviePriority(first) - adultMoviePriority(second);
            });
        }
        var currentMatches = suitable.filter(function(movie) { return !movie.isComingSoon; });
        var upcomingMatches = suitable.filter(function(movie) { return movie.isComingSoon; });
        var matches = currentMatches.concat(upcomingMatches);
        if (!matches.length) {
            status.textContent = "No movies match all the filters you selected. Try changing or removing a filter.";
            return;
        }

        var saveMessage = "";
        try {
            saveLocalSubmission(form, "Movie recommendation");
            matches.forEach(function(movie) {
                recordMovieInterest(movie, "recommendations");
            });
            saveMessage = " Your choices and recommended movies were saved in this browser.";
        } catch (error) {
            saveMessage = " Local interest counts could not all be saved: " + error.message;
        }
        if (currentMatches.length) {
            appendRecommendationGroup(results, "Currently showing", currentMatches);
        }
        if (upcomingMatches.length) {
            appendRecommendationGroup(results, "Coming soon", upcomingMatches);
        }
        updateWatchlistButtons();
        status.textContent = "Here are the best matches for " + filterDescriptions.join(", ")
            + "." + saveMessage;
    }).catch(function(error) {
        status.textContent = "Recommendations could not be loaded. " + error.message;
    });
}

function appendRecommendationGroup(results, headingText, movies) {
    var heading = document.createElement("h2");
    heading.className = "movie-group-heading";
    heading.textContent = headingText;
    results.appendChild(heading);
    movies.forEach(function(movie) {
        results.appendChild(makeMovieCard(movie));
    });
}

// 4. FORM FEEDBACK AND REGISTRATION: share error display, then validate registration.
function displayErrors(container, errors) {
    container.textContent = "";
    if (!errors.length) {
        container.hidden = true;
        return;
    }
    var heading = document.createElement("strong");
    heading.textContent = "Please fix the following:";
    container.appendChild(heading);
    var list = document.createElement("ul");
    errors.forEach(function(message) {
        var item = document.createElement("li");
        item.textContent = message;
        list.appendChild(item);
    });
    container.appendChild(list);
    container.hidden = false;
    container.focus();
}

// Check registration fields before local storage or the Mercury test form.
function validateRegistration(event) {
    var form = event.currentTarget;
    var errors = [];
    var username = form.elements.username.value.trim();
    var email = form.elements.email.value.trim();
    var phone = form.elements.phone.value.trim();
    var password = form.elements.password.value;
    var confirmation = form.elements.confirmPassword.value;
    var genres = form.querySelectorAll(".genre-options input:checked");
    // Enforce the required username format, email structure and phone digit range.
    if (!/^[A-Za-z0-9_]{5,}$/.test(username)) {
        errors.push("Username must be at least 5 characters and use only letters, numbers and underscores.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Enter a valid email address.");
    }
    if (!/^\d{8,15}$/.test(phone)) {
        errors.push("Phone number must contain 8 to 15 digits only.");
    }
    // Require a strong password and make sure both password entries match.
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password)
        || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        errors.push("Password must be at least 10 characters and include uppercase, lowercase, a number and a special character.");
    }
    if (password !== confirmation) {
        errors.push("Password and confirmation must match.");
    }
    if (!form.querySelector('input[name="gender"]:checked')) {
        errors.push("Choose a gender option.");
    }
    // Require the remaining registration selections before sending the form.
    if (genres.length === 0) {
        errors.push("Choose at least one preferred movie genre.");
    }
    if (!form.elements.country.value) {
        errors.push("Choose a country or region.");
    }
    displayErrors(document.getElementById("registerErrors"), errors);
    if (errors.length) {
        // Invalid registration data must remain on the page for correction.
        event.preventDefault();
        document.getElementById("registerStatus").textContent = "";
        consumeMercuryUpload(form);
        return;
    }

    // Send all selected values as one field because the Mercury test table keeps
    // only one value when a form submits repeated names for a multi-select.
    var submittedGenres = form.querySelector("#submittedGenres");
    if (!submittedGenres) {
        submittedGenres = document.createElement("input");
        submittedGenres.type = "hidden";
        submittedGenres.id = "submittedGenres";
        submittedGenres.name = "genres";
        form.appendChild(submittedGenres);
    }
    submittedGenres.value = Array.prototype.map.call(genres, function(option) {
        return option.value;
    }).join(", ");
    if (consumeMercuryUpload(form)) {
        return;
    }
    event.preventDefault();
    try {
        saveLocalSubmission(form, "Registration");
        document.getElementById("registerStatus").textContent = "Registration saved in this browser. Passwords are not stored.";
    } catch (error) {
        document.getElementById("registerStatus").textContent = "Registration could not be saved locally. " + error.message;
    }
}

// Keep the dropdown button label in sync while preserving every checked genre.
function updateGenreSummary() {
    var selected = document.querySelectorAll(".genre-options input:checked");
    var summary = document.getElementById("genreSummary");
    if (!summary) {
        return;
    }
    summary.textContent = selected.length
        ? Array.prototype.map.call(selected, function(input) { return input.value; }).join(", ")
        : "Choose genres";
}

// 5. BOOKING: restore the chosen film, update the form and validate the order.
function loadBookingMovies() {
    var select = document.getElementById("movieSelect");
    if (!select) {
        return;
    }
    var errors = document.getElementById("bookingErrors");
    readMovies().then(function(movies) {
        select.textContent = "";
        var emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "Choose a movie";
        select.appendChild(emptyOption);
        movies.forEach(function(movie) {
            if (!movie.isComingSoon) {
                var option = document.createElement("option");
                option.value = movie.id;
                option.textContent = movie.title;
                select.appendChild(option);
            }
        });
        // Movie cards and recommendation links pass the selected ID as a query value.
        var requestedMovie = new URLSearchParams(window.location.search).get("movie");
        if (requestedMovie && movies.some(function(movie) {
            return movie.id === requestedMovie && !movie.isComingSoon;
        })) {
            select.value = requestedMovie;
        }
        updateBookingMovie();
    }).catch(function(error) {
        errors.textContent = "Movie choices could not be loaded. " + error.message;
        errors.hidden = false;
    });
}

// Find the selected catalogue record for booking calculations and session options.
function selectedMovie() {
    var select = document.getElementById("movieSelect");
    if (!select || !movieCache) {
        return null;
    }
    return movieCache.find(function(movie) { return movie.id === select.value; }) || null;
}

// Refresh available session times and recalculate the booking total after movie changes.
function updateBookingMovie() {
    var movie = selectedMovie();
    var times = document.getElementById("screeningTime");
    var price = document.getElementById("bookingCost");
    if (!times || !price) {
        return;
    }
    times.textContent = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = movie ? "Choose a session" : "Select a movie first";
    times.appendChild(placeholder);
    if (movie) {
        // Only show session times belonging to the selected movie.
        movie.times.forEach(function(time) {
            var option = document.createElement("option");
            option.value = time;
            option.textContent = time;
            times.appendChild(option);
        });
    }
    updateBookingCost();
}

// Calculate the total using the movie's base price, quantity and ticket-type rate.
function updateBookingCost() {
    var movie = selectedMovie();
    var count = Number(document.getElementById("ticketCount").value);
    var type = document.getElementById("ticketType").value;
    var multipliers = { adult: 1, child: 0.7, student: 0.85 };
    var cost = movie && count > 0 && multipliers[type] ? movie.price * count * multipliers[type] : 0;
    document.getElementById("bookingCost").value = formatMoney(cost);
}

// Show the inputs for the selected payment type and hide the other payment option.
function togglePaymentFields() {
    var method = document.querySelector('input[name="paymentMethod"]:checked');
    var voucher = document.getElementById("voucherFields");
    var card = document.getElementById("cardFields");
    var voucherSelected = method && method.value === "voucher";
    var cardSelected = method && method.value === "online";
    voucher.hidden = !voucherSelected;
    card.hidden = !cardSelected;
    document.getElementById("voucherCode").required = false;
    document.getElementById("cardType").required = Boolean(cardSelected);
    document.getElementById("cardNumber").required = Boolean(cardSelected);
}

// Validate booking details before local storage or the Mercury test form.
function validateBooking(event) {
    var form = event.currentTarget;
    var errors = [];
    var email = form.elements.email.value.trim();
    var phone = form.elements.phone.value.trim();
    var date = form.elements.screeningDate.value;
    var time = form.elements.screeningTime.value;
    var count = Number(form.elements.ticketCount.value);
    var method = form.querySelector('input[name="paymentMethod"]:checked');
    // Check customer details, a future session and a positive ticket quantity.
    if (!form.elements.movie.value) errors.push("Choose a movie.");
    if (!form.elements.fullName.value.trim()) errors.push("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
    if (!/^\d{10,}$/.test(phone)) errors.push("Phone number must contain at least 10 digits.");
    if (!date || !time) {
        errors.push("Choose a screening date and session time.");
    } else if (new Date(date + "T" + time) < new Date()) {
        errors.push("Screening date and time cannot be in the past.");
    }
    if (!Number.isInteger(count) || count < 1) errors.push("Number of tickets must be greater than zero.");
    if (!method) {
        errors.push("Choose a payment method.");
    } else if (method.value === "online") {
        // Amex uses 15 digits; Visa and Mastercard use 16 in this format-only demo.
        var cardType = form.elements.cardType.value;
        var cardNumber = form.elements.cardNumber.value.trim();
        var expectedLength = cardType === "amex" ? 15 : 16;
        if (!cardType) errors.push("Choose a credit card type.");
        if (!new RegExp("^\\d{" + expectedLength + "}$").test(cardNumber)) {
            errors.push("Enter a " + expectedLength + "-digit card number for the selected card type.");
        }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.billingEmail.value.trim())) {
        errors.push("Enter a valid billing email address.");
    }
    displayErrors(document.getElementById("bookingErrors"), errors);
    if (errors.length) {
        // Keep invalid entries on the booking page so they can be corrected.
        event.preventDefault();
        consumeMercuryUpload(form);
        document.getElementById("bookingStatus").textContent = "";
        return;
    }
    if (consumeMercuryUpload(form)) {
        return;
    }
    event.preventDefault();
    try {
        saveLocalSubmission(form, "Ticket booking");
        document.getElementById("bookingStatus").textContent = "Booking saved in this browser. Use fake payment details only.";
    } catch (error) {
        document.getElementById("bookingStatus").textContent = "Booking could not be saved locally. " + error.message;
    }
}

// Save movie suggestions locally unless the Mercury test action was requested.
function handleMovieSuggestion(event) {
    var form = event.currentTarget;
    if (!form.reportValidity()) {
        event.preventDefault();
        consumeMercuryUpload(form);
        return;
    }
    if (consumeMercuryUpload(form)) {
        return;
    }
    event.preventDefault();
    var status = document.getElementById("suggestionStatus");
    try {
        saveLocalSubmission(form, "Movie suggestion");
        status.textContent = "Movie suggestion saved in this browser.";
        loadSavedMovieSuggestions();
    } catch (error) {
        status.textContent = "Movie suggestion could not be saved locally. " + error.message;
    }
}

// Populate a weekly list of earlier titles without deleting the Admin's saved history.
function loadSavedMovieSuggestions() {
    var list = document.getElementById("previousMovieSuggestions");
    var status = document.getElementById("suggestionStatus");
    if (!list) {
        return;
    }
    while (list.options.length > 1) {
        list.remove(1);
    }
    try {
        var titles = {};
        var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        readSavedSubmissions().forEach(function(submission) {
            if (!submission || submission.formType !== "Movie suggestion" || !submission.answers) {
                return;
            }
            var submittedAt = Date.parse(submission.submittedAt);
            if (!Number.isFinite(submittedAt) || submittedAt < cutoff) {
                return;
            }
            var title = String(submission.answers.movieTitle || "").trim();
            if (title) {
                var key = title.toLocaleLowerCase();
                if (!titles[key]) {
                    titles[key] = title;
                }
            }
        });
        Object.keys(titles).sort().forEach(function(key) {
            var option = document.createElement("option");
            option.value = key;
            option.textContent = titles[key];
            list.appendChild(option);
        });
    } catch (error) {
        status.textContent = "Previously suggested titles could not be loaded. " + error.message;
    }
}

// 6. PAGE STARTUP: connect each page's behaviors after its HTML controls are ready.
function bindPageBehaviors() {
    // Set up movie listing interactions when present.
    renderMovieListing();
    var recommendForm = document.getElementById("recommendForm");
    if (recommendForm) {
        recommendForm.addEventListener("submit", showRecommendations);
        loadRecommendationGenres();
    }
    var suggestionDialog = document.getElementById("movieSuggestionDialog");
    var openSuggestionDialog = document.getElementById("openSuggestionDialog");
    var closeSuggestionDialog = document.getElementById("closeSuggestionDialog");
    if (suggestionDialog && openSuggestionDialog && closeSuggestionDialog) {
        openSuggestionDialog.addEventListener("click", function() {
            loadSavedMovieSuggestions();
            suggestionDialog.showModal();
        });
        closeSuggestionDialog.addEventListener("click", function() {
            suggestionDialog.close();
        });
        var suggestionForm = suggestionDialog.querySelector("form");
        suggestionForm.addEventListener("submit", handleMovieSuggestion);
        document.getElementById("previousMovieSuggestions").addEventListener("change", function(event) {
            var option = event.currentTarget.selectedOptions[0];
            if (!option || !option.value) {
                return;
            }
            document.getElementById("suggestionTitle").value = option.textContent;
            var submissions = readSavedSubmissions();
            var matchingSuggestion = submissions.slice().reverse().find(function(submission) {
                return submission && submission.formType === "Movie suggestion"
                    && String(submission.answers.movieTitle || "").trim().toLocaleLowerCase() === option.value;
            });
            if (matchingSuggestion && matchingSuggestion.answers.movieGenre) {
                document.getElementById("suggestionGenre").value = matchingSuggestion.answers.movieGenre;
            }
        });
        document.getElementById("suggestionTitle").addEventListener("input", function() {
            var previousSuggestions = document.getElementById("previousMovieSuggestions");
            if (previousSuggestions.value) {
                previousSuggestions.value = "";
                document.getElementById("suggestionGenre").value = "";
            }
        });
        document.getElementById("suggestionMercuryButton").addEventListener("click", function() {
            requestMercuryUpload(suggestionForm);
        });
    }
    var form = document.getElementById("regform");
    if (form && form.elements.username) {
        form.addEventListener("submit", validateRegistration);
        document.getElementById("registerMercuryButton").addEventListener("click", function() {
            requestMercuryUpload(form);
        });
        form.querySelectorAll(".genre-options input").forEach(function(checkbox) {
            checkbox.addEventListener("change", updateGenreSummary);
        });
    }

    if (form && form.elements.movie) {
        var bookingForm = form;
        // Load movie options before updating the selection and cost.
        loadBookingMovies();
        document.getElementById("movieSelect").addEventListener("change", updateBookingMovie);
        document.getElementById("ticketCount").addEventListener("input", updateBookingCost);
        document.getElementById("ticketType").addEventListener("change", updateBookingCost);
        document.querySelectorAll('input[name="paymentMethod"]').forEach(function(input) {
            input.addEventListener("change", togglePaymentFields);
        });
        var sameEmail = document.getElementById("sameBillingEmail");
        sameEmail.addEventListener("change", function() {
            // Copy the contact email when the billing-email shortcut is checked.
            var billing = document.getElementById("billingEmail");
            billing.value = sameEmail.checked ? document.getElementById("bookingEmail").value : "";
        });
        document.getElementById("bookingEmail").addEventListener("input", function() {
            // Keep billing email synchronized while the shortcut remains selected.
            if (sameEmail.checked) {
                document.getElementById("billingEmail").value = this.value;
            }
        });
        // Prevent choosing a date earlier than the user's current local date.
        var today = new Date();
        var localToday = today.getFullYear() + "-"
            + String(today.getMonth() + 1).padStart(2, "0") + "-"
            + String(today.getDate()).padStart(2, "0");
        document.getElementById("screeningDate").min = localToday;
        bookingForm.addEventListener("submit", validateBooking);
        document.getElementById("bookingMercuryButton").addEventListener("click", function() {
            requestMercuryUpload(bookingForm);
        });
    }
}

// Initialize page interactions once all page elements are available.
document.addEventListener("DOMContentLoaded", bindPageBehaviors);
