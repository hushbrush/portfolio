// Fetch the data from data.json

const colors ={ projectCircles: "#000000"}; 
// Call the function



landingPage();
fetch('data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        generateCircleAttributes(data);
        renderVennDiagram(data);
    })
    .catch(error => {
        console.error('Error fetching or parsing data.json:', error);
    });

// Create a function to determine the size of each project circle
function generateCircleAttributes(projects) {
    const maxSize = 55; // Maximum circle radius
    const minSize = 10; // Minimum circle radius

    // Determine the date range
    const newestDate = new Date(
        Math.max(...projects.map(project => new Date(project.dateCompleted)))
    );
    const oldestDate = new Date(
        Math.min(...projects.map(project => new Date(project.dateCompleted)))
    );

    projects.forEach(project => {
        const projectDate = new Date(project.dateCompleted);
        const size =
            ((projectDate - oldestDate) / (newestDate - oldestDate)) * (maxSize - minSize) +
            minSize;
        project.size = size;
        
    });
}

//make the circles more clickable, ui wise. 
//make the circles 

function getCategoryCounts(projects) {
    let counts = {
        data: 0,
        design: 0,
        art: 0,
        dataDesign: 0,
        dataArt: 0,
        designArt: 0,
        allCategories: 0
    };

    projects.forEach(project => {
        const isData = project.categories.toLowerCase().includes("data");
        const isDesign = project.categories.toLowerCase().includes("design");
        const isArt = project.categories.toLowerCase().includes("illustration");

        if (isData) counts.data++;
        if (isDesign) counts.design++;
        if (isArt) counts.art++;

        if (isData && isDesign && isArt) counts.allCategories++;
        else if (isData && isDesign) counts.dataDesign++;
        else if (isData && isArt) counts.dataArt++;
        else if (isDesign && isArt) counts.designArt++;
    });

    return counts;
}


function calculateVennCircleRadius(projectCount, maxProjects) {
    // Calculate the circle radius based on project count, assuming max size for the most populated category
    const maxRadius = 260;  // The fixed maximum radius of a circle when fully occupied
    const minRadius = 50;  // Minimum radius for small categories
    const scalingFactor = maxProjects > 0 ? (projectCount / maxProjects) : 0;

    // Adjust the radius based on the category overlap
    const radiusAdjustmentFactor = scalingFactor * 0.4; // Adjust based on category overlap
    return minRadius + (scalingFactor + radiusAdjustmentFactor) * (maxRadius - minRadius);
}


function determineVennCirclePositions(svgWidth, svgHeight, circleRadius, counts) {
    // Adjust positions based on the calculated circle radius for each category
    const overlapX = svgWidth / 2;
    const overlapY = svgHeight / 4-20;

    // Define circleDistance dynamically depending on the categories' project counts
    const circleDistance = circleRadius * 1.2;

    return [
        { id: "data", cx: overlapX - circleDistance / 2, cy: overlapY + circleDistance / 3, radius: circleRadius },
        { id: "design", cx: overlapX + circleDistance / 2, cy: overlapY + circleDistance / 3, radius: circleRadius },
        { id: "art", cx: overlapX, cy: overlapY + circleDistance * 1.48, radius: circleRadius }
    ];
}


function assignProjectPositions(projects, vennCircles) {
    const overlapX = vennCircles[0].cx;
    const overlapY = vennCircles[0].cy;
    console.log(vennCircles);
    projects.forEach(project => {
        const isData = project.categories.toLowerCase().includes("data");
        const isDesign = project.categories.toLowerCase().includes("design");
        const isArt = project.categories.toLowerCase().includes("illustration");

        if (isData && isDesign && isArt) {
            console.log("all three: " + project.projectName);
            
            project.targetX = (vennCircles[0].cx + vennCircles[1].cx + vennCircles[2].cx) / 3;
            project.targetY = (vennCircles[0].cy + vennCircles[1].cy + vennCircles[2].cy) / 3;

        } else if (isData && isDesign) {
            console.log("Midpoint between data and design: " + project.projectName);
            project.targetX = (vennCircles[0].cx + vennCircles[1].cx) / 2;
            project.targetY = (vennCircles[0].cy + vennCircles[1].cy) / 2;
        } else if (isData && isArt) {
            console.log("Midpoint between data and art: " + project.projectName);
            project.targetX = (vennCircles[0].cx + vennCircles[2].cx) / 2;
            project.targetY = (vennCircles[0].cy + vennCircles[2].cy) / 2;
        } else if (isDesign && isArt) {
            console.log("Midpoint between design and art: " + project.projectName);
            project.targetX = (vennCircles[1].cx + vennCircles[2].cx) / 2;
            project.targetY = (vennCircles[1].cy + vennCircles[2].cy) / 2;
        } else if (isData) {
            console.log("data: " + project.projectName);
            project.targetX = vennCircles[0].cx;
            project.targetY = vennCircles[0].cy;
        } else if (isDesign) {
            console.log("design: " + project.projectName);
            project.targetX = vennCircles[1].cx;
            project.targetY = vennCircles[1].cy;
        } else if (isArt) {
            console.log("art: " + project.projectName);
            project.targetX = vennCircles[2].cx;
            project.targetY = vennCircles[2].cy;
        } else {
            console.log("random placement: " + project.projectName);
            project.targetX = Math.random() * window.innerWidth;
            project.targetY = Math.random() * window.innerHeight;
        }
    });
}


function renderVennDiagram(projects) {
    const svgWidth = window.innerWidth;
    const svgHeight = window.innerHeight * 1.2;

    // Get project counts by category
    const counts = getCategoryCounts(projects);

    // Calculate the maximum count to determine the scaling factor for circle sizes
    const maxProjects = Math.max(counts.data, counts.design, counts.art);
    const circleRadius = 280;

    // SVG setup
    const svg = d3
        .select("#projectsSection")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    //
    // ─── 1) DEFINE <pattern>s FOR EACH PROJECT THUMBNAIL ──────────────────────
    //
    const defs = svg.append("defs");
    projects.forEach(project => {
        const safeName = project.projectName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-]/g, "");

        defs.append("pattern")
            .attr("id", `thumb-${safeName}`)
            .attr("patternUnits", "objectBoundingBox")
            .attr("width", 1)
            .attr("height", 1)
          .append("image")
            .attr("href", `assets/thumbnails/${safeName}.png`)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("width", project.size * 2)
            .attr("height", project.size * 2);
    });

    //
    // ─── 2) DRAW VENN CIRCLES & LABELS ────────────────────────────────────────
    //
    const vennCircles = determineVennCirclePositions(svgWidth, svgHeight, circleRadius, counts);

    svg.selectAll(".venn-circle")
        .data(vennCircles)
        .enter()
      .append("circle")
        .attr("class", "venn-circle")
        .attr("id", d => d.id)
        .attr("cx", d => d.cx)
        .attr("cy", d => d.cy)
        .attr("r", d => d.radius)
        .attr("fill", "none")
        .attr("stroke", "black");

    svg.selectAll(".venn-circle-text")
        .data(vennCircles)
        .enter()
      .append("text")
        .attr("class", "venn-circle-text")
        .attr("x", d => d.cx)
        .attr("y", d => d.id === "art"
            ? d.cy + circleRadius + 20
            : d.cy - circleRadius - 10)
        .text(d => d.id.charAt(0).toUpperCase() + d.id.slice(1))
        .attr("text-anchor", "middle")
        .style("font-family", "'bricolage-grotesque', sans-serif")
        .style("font-weight", "300")
        .style("font-style", "normal")
        .style("font-size", "16px")
        .attr("fill", "black");

    // Assign project positions to circles
    assignProjectPositions(projects, vennCircles);

    //
    // ─── 3) FORCE-SIM & PROJECT CIRCLES ──────────────────────────────────────
    //
    const simulation = d3.forceSimulation(projects)
        .force("x", d3.forceX(d => d.targetX).strength(0.3))
        .force("y", d3.forceY(d => d.targetY).strength(0.3))
        .force("collision", d3.forceCollide(d => d.size + 3))
        // (radial force omitted for brevity)
        .on("tick", () => {
            svg.selectAll(".project-circle")
                .data(projects)
                .join("circle")
                .attr("class", "project-circle")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .attr("r", d => d.size)
                .attr("fill", d => {

                    const safeName = d.projectName
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9\-]/g, "");
                        console.log(safeName)
                    return `url(#thumb-${safeName})`;
                })
                .attr("stroke", "black")
                .attr("stroke-width", 0.2)
                .style("cursor", "pointer")
              .on("mouseenter", (event, d) => {
                  showTooltip(event, d.projectName, d.line);
                  showGifWithAnimation(event, d);
              })
              .on("mouseleave", (event, d) => {
                  d3.select("#gifContainer").remove();
                  d3.select(event.target)
                    .transition().duration(50)
                    .attr("r", d.size);
                  hideTooltip();
              })
              .on("click", (event, d) => {
                  const url = d.link
                      ? d.link
                      : urlMaker(d.projectName);
                  window.open(url, "_blank");
              });
        });

    simulation.alpha(1).restart();
}



function urlMaker(name) {
    const projectName = name.toLowerCase().replace(/ /g, "-"); // Convert to URL-friendly format
   const url = `${projectName}.html`; // Pass project name as query param
   //const url = `${projectName}.html`;
    return url;
}

function pathMaker(name) {
    const projectName = name.toLowerCase().replace(/ /g, "-"); // Convert to URL-friendly format
    const url = `assets/thumbnails/${projectName}.png`; // Pass project name as query param
    return url;
}


// Tooltip functions
function showTooltip(event, name, content) {
    const tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("left", `${event.pageX + 45}px`)
        .style("top", `${event.pageY+70}px`)
        .style("width", "300px")
        .style("padding", "5px")
        .style("background", "rgba(0,0,0,0.9)")
        .style("color", "white")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-family", "bricolage-grotesque, sans-serif")
        .style("font-weight", "100")
        .style("font-style", "normal")
        .html(`<strong>${name}</strong>: ${content}`);
    tooltip.transition().duration(200).style("opacity", 1);
}

function hideTooltip() {
    d3.select("#tooltip").remove();
}

function showGifWithAnimation(event, project) {
    // Ensure the GIF source is dynamically set based on the provided path
    const gifSource = `assets/${project.projectName.toLowerCase().replaceAll(" ", "-")}/loop.mp4`;
    console.log(gifSource);
    // Create the container for the GIF (circle with radius animation)
    const circleContainer = d3.select("body")
        .append("div")
        .attr("id", "gifContainer")
        .style("width", "0px") // Start with 0 size
        .style("height", "0px") // Start with 0 size
        .style("border-radius", "50%")
        .style("position", "absolute")
        .style("overflow", "hidden")
        .style("z-index", "1000")
        .style("background-color", "rgba(0, 0, 0, 0.8)") // Add semi-transparent background for readability
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("pointer-events", "none");

    // Add the GIF element inside the circular container
    const gifElement =circleContainer.append("video")
    .attr("src", gifSource) // Replace gifSource with the path to your MP4
    .attr("alt", "Project Video") // Optional, for accessibility
    .attr("autoplay", true) // Autoplay the video
    .attr("loop", true) // Loop the video
    .attr("muted", true) // Mute the video (optional but recommended for autoplay)
    .attr("playsinline", true) // Ensure it works on mobile browsers
    .style("width", "auto")
    .style("height", "300px") // Adjust the size of the video
    .style("opacity", 1); // Adjust opacity if needed


  

    // Calculate initial position based on the hovered circle
    const initialX = event.pageX;
    const initialY = event.pageY;

    // Position the circle at the hovered project's location (cursor's position)
    circleContainer
        .style("left", `${initialX}px`) // Start at the cursor's x position
        .style("top", `${initialY}px`);

    // Animate the circle to grow and move to the top-right of the cursor
    circleContainer.transition()
        .duration(500) // Animation duration
        .style("width", "300px")
        .style("height", "300px")
        .style("left", `${initialX + 50}px`) // Move slightly to the top-right of the cursor
        .style("top", `${initialY - 250}px`) // Move slightly upward from the cursor
        .on("end", () => {
            // Reveal the GIF and tooltip after animation ends
            gifElement.transition().duration(200).style("opacity", 1);
            
        });

    // Remove the GIF bubble on mouseleave
    document.addEventListener("mouseleave", function onMouseLeave() {
        circleContainer.remove();
        document.removeEventListener("mouseleave", onMouseLeave);
    });
}
legend();
function legend()
{
    // Add a legend on top right that says size=time since completed
    const legend = d3.select("#legend")
        

    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .text("Size = Time Since Completed")
        .style("font-family", "'bricolage-grotesque', sans-serif")
        .style("font-weight", "300")
        .style("font-style", "normal")
        .style("font-size", "14px")
        .attr("fill", "black");

   
}
function landingPage() {
    const section = d3.select("#landingPageSection")
        
    // Get section dimensions
    const sectionWidth = section.node().offsetWidth;
    const sectionHeight = section.node().offsetHeight;

    // Create an SVG pattern using D3
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", sectionWidth);
    svg.setAttribute("height", sectionHeight);
    svg.setAttribute("xmlns", svgNS);

    // Add circles for the pattern
    const circleData = [];
    const circleRadius = 1;
    const gap = 15; // Space between circles
    for (let x = 0; x < sectionWidth; x += circleRadius + gap) {
        for (let y = 0; y < sectionHeight; y += circleRadius + gap) {
            circleData.push({ cx: x, cy: y, r: circleRadius });
        }
    }

    // Draw the circles
    circleData.forEach(({ cx, cy, r }) => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", r);
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", "rgba(255,255,255,1)");
        circle.setAttribute("stroke-width", "0.5");
        svg.appendChild(circle);
    });


    // Convert SVG to a background
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Apply the SVG as a background
    section
        .style("background-image", `url(${svgUrl})`)
        .style("background-size", "cover")
        .style("background-position", "center")
        .style("background-repeat", "repeat")
        .style("position", "relative") // Ensure it sits properly
        .style("z-index", "1");

    // Ensure text is visible
    section.select(".container").style("position", "relative").style("z-index", "2");
   
}
