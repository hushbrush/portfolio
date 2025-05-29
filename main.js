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
    const maxSize = 80; // Maximum circle radius
    const minSize = 30; // Minimum circle radius

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
        
        if (isData) counts.data++;
        if (isDesign) counts.design++;
     

        if (isData && isDesign) counts.allCategories++;
    
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
    const overlapX = svgWidth / 2.05;
    const overlapY = svgHeight / 4;

    // Define circleDistance dynamically depending on the categories' project counts
    const overlapBitweenCircles = 80; 
    return [
        { id: "data", cx: overlapX - circleRadius / 2+overlapBitweenCircles/2, cy: overlapY + circleRadius / 2, radius: circleRadius },
        { id: "design", cx: overlapX + circleRadius / 2-overlapBitweenCircles/2, cy: overlapY + circleRadius / 2, radius: circleRadius },
       
    ];
}


function assignProjectPositions(projects, vennCircles) {
    const overlapX = vennCircles[0].cx;
    const overlapY = vennCircles[0].cy;
    console.log(vennCircles);
    projects.forEach(project => {
        const isData = project.categories.toLowerCase().includes("data");
        const isDesign = project.categories.toLowerCase().includes("design");
       

        if (isData && isDesign) {
            console.log("Midpoint between data and design: " + project.projectName);
            project.targetX = (vennCircles[0].cx + vennCircles[1].cx) / 2;
            project.targetY = (vennCircles[0].cy + vennCircles[1].cy) / 2;
        } 
        else if (isData) {
            console.log("data: " + project.projectName);
            project.targetX = vennCircles[0].cx-150;
            project.targetY = vennCircles[0].cy;
        } else if (isDesign) {
            console.log("design: " + project.projectName);
            project.targetX = vennCircles[1].cx+250;
            project.targetY = vennCircles[1].cy;
        }
    });
}



// ─── helper force to keep nodes inside a circle “wall” ─────────────────────
function forceContainInCircle(cx, cy, r, testFn) {
    let nodes;
    function force(alpha) {
      for (const d of nodes) {
        if (!testFn(d)) continue;
        const dx = d.x - cx, dy = d.y - cy;
        const dist = Math.hypot(dx, dy);
        const overflow = (dist + d.size) - r;
        if (overflow > 0) {
          d.x -= dx / dist * overflow * alpha;
          d.y -= dy / dist * overflow * alpha;
        }
      }
    }
    force.initialize = _ => nodes = _;
    return force;
  }
  
  
  // ─── updated renderVennDiagram with “walls” ───────────────────────────────
  function renderVennDiagram(projects) {
      const svgWidth  = window.innerWidth;
      const svgHeight = window.innerHeight * 1.1;
      const circleRadius = 430;
  
      // SVG setup
      const svg = d3.select("#projectsSection")
        .append("svg")
          .attr("width",  svgWidth)
          .attr("height", svgHeight);
  
      // 1) defs for thumbnail patterns…
      const defs = svg.append("defs");
      projects.forEach(project => {
        const safe = project.projectName
          .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
        defs.append("pattern")
          .attr("id", `thumb-${safe}`)
          .attr("patternUnits", "objectBoundingBox")
          .attr("width", 1).attr("height", 1)
          .append("image")
            .attr("href", `assets/thumbnails/${safe}.png`)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("width", project.size * 2)
            .attr("height", project.size * 2);
      });
  
      // 2) draw Venn circles & labels…
      const counts      = getCategoryCounts(projects);
      const vennCircles = determineVennCirclePositions(svgWidth, svgHeight, circleRadius, counts);
      const [cData, cDesign] = vennCircles;
  
      svg.selectAll(".venn-circle")
        .data(vennCircles)
        .enter().append("circle")
          .attr("class", "venn-circle")
          .attr("id",    d => d.id)
          .attr("cx",    d => d.cx)
          .attr("cy",    d => d.cy)
          .attr("r",     d => d.radius)
          .attr("fill",  "none")
          .attr("stroke","black");
  
      svg.selectAll(".venn-circle-text")
        .data(vennCircles)
        .enter().append("text")
          .attr("class", "venn-circle-text")
          .attr("x", d => d.cx)
          .attr("y", d => d.cy - circleRadius - 10)
          .text(d => d.id.charAt(0).toUpperCase() + d.id.slice(1))
          .attr("text-anchor","middle")
          .style("font-family","'bricolage-grotesque', sans-serif")
          .style("font-weight","300")
          .style("font-size","16px")
          .attr("fill","black");
  
      // 3) assign project target positions…
      assignProjectPositions(projects, vennCircles);
  
      // 4) force simulation with two “wall” forces
      const simulation = d3.forceSimulation(projects)
        .force("x",         d3.forceX(d => d.targetX).strength(0.6))
        .force("y",         d3.forceY(d => d.targetY).strength(0.3))
        .force("collision", d3.forceCollide(d => d.size + 10))
  
        // contain “data” nodes inside the data circle
        .force("containData",
          forceContainInCircle(
            cData.cx, cData.cy, circleRadius,
            d => d.categories.toLowerCase().includes("data")
          )
        )
  
        // contain “design” nodes inside the design circle
        .force("containDesign",
          forceContainInCircle(
            cDesign.cx, cDesign.cy, circleRadius,
            d => d.categories.toLowerCase().includes("design")
          )
        )
  
        .on("tick", () => {
          svg.selectAll(".project-circle")
            .data(projects)
            .join("circle")
              .attr("class","project-circle")
              .attr("cx",  d => d.x - 20)
              .attr("cy",  d => d.y - 20)
              .attr("r",   d => d.size)
              .attr("fill",d => {
                const safe = d.projectName
                  .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
                return `url(#thumb-${safe})`;
              })
              .attr("stroke","black")
              .attr("stroke-width",0.2)
              .style("cursor","pointer")
            .on("mouseenter", (e,d) => {
              showTooltip(e, d.projectName, d.line);
              showGifWithAnimation(e, d);
            //   changeCircleSize(e, d);
              // Then bind it to your circles:

              //make this circle 2 times its current size, with a transition, and an empty circle around it that grows along with the project circle. 
              //should I also make the other circles 50% opacity?
            })
            .on("mouseleave", (e,d) => {
              d3.select("#gifContainer").remove();
              d3.select(e.target).transition().duration(50).attr("r", d.size);
              hideTooltip();
            //   changeCircleSize(e, d);
            })
            .on("click", (e,d) => {
               if(d.youtubeId)
                {
                showVideoOverlay(d);

               }
              else
                {
                window.open(urlMaker(d.projectName), "_blank");
                }
              
               
              
            });
            
        });
  
      simulation.alpha(1).restart();
  }
  

  function changeCircleSize(event, project) {
    const circle = d3.select(event.target);
  
    // On hover, enlarge this circle and fade out the others
    if (event.type === "mouseover") {
      // store original radius once
      if (!circle.node().__origR) {
        circle.node().__origR = +circle.attr("r");
      }
      const origR = circle.node().__origR;
      const newR = origR * 2;
  
      // fade other circles
      d3.selectAll("circle")
        .filter(function() { return this !== circle.node(); })
        .transition()
          .duration(300)
          .style("opacity", 0.1);
  
      // enlarge hovered circle
      circle.raise()
        .transition()
          .duration(300)
          .attr("r", newR);
  
    // On mouseleave, restore sizes and opacities
    } else if (event.type === "mouseleave") {
      const origR = circle.node().__origR || +circle.attr("r") / 2;
  
      // shrink this circle back
      circle.transition()
        .duration(300)
        .attr("r", origR);
  
      // restore all circles' opacity
      d3.selectAll("circle")
        .transition()
          .duration(300)
          .style("opacity", 1);
    }
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

function showVideoOverlay(project) {
    // 1) Create the full-screen overlay
    const overlay = d3.select("body")
      .append("div")
      .attr("id", "videoOverlay")
      .style("position", "fixed")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100vw")
      .style("height", "100vh")
      .style("background-color", "rgba(0, 0, 0, 1)")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("z-index", "9999");
  
    // 2) Insert the video (or iframe) to cover the background
    const useYouTube = !!project.youtubeId;  // toggle based on your source
    if (useYouTube) {
      // Embed an unlisted YouTube video (autoplay + loop + mute)
      overlay.append("iframe")
        .attr("src",
          `https://www.youtube.com/embed/${project.youtubeId}`
          + `?autoplay=1&loop=1&playlist=${project.youtubeId}`
          + `&mute=1&controls=0&modestbranding=1`)
        .attr("frameborder", "0")
        .attr("allow", "autoplay; encrypted-media")
        .style("width", "100%")
        .style("height", "100%")
        .style("pointer-events", "none");  // clicks pass through
    } else {
      // Fallback to MP4
      overlay.append("video")
        .attr("src", project.videoUrl)   // e.g. S3, Cloudflare, etc.
        .attr("autoplay", true)
        .attr("loop", true)
        .attr("muted", true)
        .attr("playsinline", true)
        .style("width", "100%")
        .style("height", "100%")
        .style("object-fit", "cover")
        .style("pointer-events", "none");
    }
  

//adding context
//think about it for a bit if I need it or not

// const info = overlay.append("div")
// .style("position", "absolute")
// .style("bottom", "100px")
// .style("left", "20px")
// .style("color", "white")
// .style("font-family", "'bricolage-grotesque', sans-serif")
// .style("font-weight", "300")
// .style("max-width", "300px");

// info.append("h2")
// .text(project.projectName)
// .style("margin", "0 0 5px 0")
// .style("font-size", "1.2rem");

// info.append("p")
// .text(project.line)   // make sure this is a 1–2 sentence summary
// .style("margin", "0")
// .style("font-size", "0.9rem")
// .style("line-height", "1.3");

    // 3) Buttons container in bottom-left
    const btns = overlay.append("div")
      .attr("id", "videoButtons")
      .style("position", "absolute")
      .style("bottom", "20px")
      .style("left", "20px")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("gap", "10px");
  
    // 4) Helper to close overlay
    function closeOverlay() {
      overlay.remove();
      d3.select(window).on("keydown.videoOverlay", null);
    }
  
    // 5) Add the three buttons
  
    const actions = [
      { text: "Launch Project",    onClick: () => window.open(project.link, "_blank") },
      { text: "Back to Projects",   onClick: closeOverlay },
    //   { text: "Process",            onClick: () => processProject(project) }
    ];
  
    actions.forEach(({ text, onClick }) => {
      btns.append("button")
        .text(text)
        .style("padding", "10px 20px")
        .style("background", "black")
        .style("border", "0.5px solid white")
        .style("border-radius", "5px")
        .style("color", "white")
        .style("font-family", "'bricolage-grotesque', sans-serif")
        .style("font-weight", "300")
        .style("cursor", "pointer")
        .on("click", onClick);
    });
  
    // 6) Optional: close on Escape
    d3.select(window)
      .on("keydown.videoOverlay", (e) => {
        if (e.key === "Escape") closeOverlay();
      });
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
