document.addEventListener("DOMContentLoaded", function()
{
    // Assign elements to variables
    const bioButton = document.querySelector("#bio-button");
    const bio = document.querySelector("#bio");
    const smLink = document.querySelector("#social-media-link");

    bioButton.onclick = function()
    {
        if(bio.hidden) {
            bio.hidden = false; 
            bioButton.textContent = "Less about me";
        } else { 
            bio.hidden = true;
            bioButton.textContent = "More about me";
        };
    };

    smLink.onclick = function()
    {
        smLink.textContent = "¯\_(ツ)_/¯";
    };
});