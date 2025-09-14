// add an if that checks if it's only design and then the hover video plays on the left instead of the right.

const colors ={ projectCircles: "#000000"}; 

let projects = [];                           // <— add this
const slugify = s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
const bySlug  = slug => projects.find(p => slugify(p.projectName) === slug);



landingPage();
fetch('data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
        projects = data;  
        generateCircleAttributes(data);
        renderVennDiagram(data);

        // 🔑 Now that projects exist, try opening modal from hash
        openFromHash();
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
    const maxRadius = 360;  // The fixed maximum radius of a circle when fully occupied
    const minRadius = 30;  // Minimum radius for small categories
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
    const overlapBitweenCircles = 100; 
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
           
            project.targetX = (vennCircles[0].cx+10 + vennCircles[1].cx) / 2;
            project.targetY = (vennCircles[0].cy+20 + vennCircles[1].cy) / 2;
        } 
        else if (isData) {
           
            project.targetX = vennCircles[0].cx-150;
            project.targetY = vennCircles[0].cy;
        } else if (isDesign) {
           
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
              showTooltip(e, d.projectName, d.line, d.categories);
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
              showProjectModal(d);
              const slug = slugify(d.projectName);
              if (location.hash !== `#${slug}`) history.pushState({ project: slug }, '', `#${slug}`);
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
      const newR = origR * 10;
  
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
function showTooltip(event, name, content, categories) {
  const offsetX = 100;
const tooltipWidth = 480;

  if(categories.includes("Data"))
    tooltipLeft = event.pageX + offsetX;
 else 
  tooltipLeft = event.pageX - offsetX - tooltipWidth;

const tooltip = d3
.select("body")
.append("div")
.attr("id", "tooltip")
.style("position", "absolute")
.style("left", `${tooltipLeft}px`)
.style("top", `${event.pageY + 70}px`)
.style("width", tooltipWidth + "px")
.style("padding", "15px")
.style("background", "rgba(0,0,0,0.9)")
.style("color", "white")
.style("border-radius", "20px")
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

function showProjectModal(project) {
  // Remove existing overlay if any
  d3.select("#videoOverlay").remove();
  const slug = slugify(project.projectName);

  // Create the full-screen dark background
  const overlay = d3.select("body")
    .append("div")
    .attr("id", "videoOverlay")
    .attr("data-slug", slug)
    .style("position", "fixed")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100vw")
    .style("height", "100vh")
    .style("background-color", "rgba(0,0,0,0.8)")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("z-index", "9999");

  // Main modal container
  const modal = overlay.append("div")
    .style("background", "#fadedc")
    .style("color", "white")
    .style("width", "90vw")
    .style("height", "80vh")
    .style("display", "flex")
    .style("border-radius", "10px")
    .style("overflow", "hidden")
    .style("position", "relative");

  // Close button
  modal.append("div")
    .text("×")
    .style("position", "absolute")
    .style("top", "10px")
    .style("right", "20px")
    .style("font-size", "2rem")
    .style("cursor", "pointer")
    .on("click", closeOverlay);

  // LEFT SIDE: media (images/videos)
const left = modal.append("div")
.style("flex", "5")
.style("background", "#f8f7fc")
.style("display", "flex")
.style("flex-direction", "column")
.style("align-items", "center")
.style("overflow-y", "auto")
.style("gap", "10px")
.style("padding", "10px");
console.log(project);

 
  (project.mediaLinks || []).forEach(link => {
    if (link.includes("youtube.com/embed") || link.includes("youtu.be")) {
      let wrapper = left.append("div")
      .style("position", "relative")
      .style("width", "100%")
      .style("padding-bottom", "56.25%") // 16:9 ratio
      .style("height", "0")
      .style("margin-bottom", "10px");

    wrapper.append("iframe")
      .attr("src", link)
      .attr("frameborder", "0")
      .attr("allow", "autoplay; encrypted-media; picture-in-picture")
      .attr("allowfullscreen", true)
      .style("position", "absolute")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100%")
      .style("height", "100%");
    } else {
      left.append("img")
        .attr("src", link)
        .style("width", "100%")
        .style("height", "auto")
        .style("object-fit", "cover")
        .style("margin-bottom", "10px");
    }
  });

  // RIGHT SIDE: project info
  const right = modal.append("div")
    .style("flex", "1")
    .style("background", "#1a1a1a")
    .style("padding", "20px")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("justify-content", "flex-start")
    .style("gap", "15px")
    .style("overflow-y", "auto");

  right.append("p")
    .text(project.projectName || "Untitled Project")
    .style("font-weight", "semibold 600")
    .style("padding", "30px,  15px,  15px, 15px") 
    .style("margin", "0")
    .style("font-size", "2rem")
    .style("line-height", "1.1");

  //add a horizontal line here
  right.append("hr")
  .style("border", "0")
  .style("height", "1px")
  .style("background", "#555")
  .style("margin", "10px 0");

  if(project.link!=null)
    {
      right.append("button")
      .text("Launch Project")
      .style("padding", "8px 15px")
      .style("background", "#000")
      .style("color", "white")
      .style("border", "1px solid white")
      .style("cursor", "pointer")
      .style("margin", "10px 0")
      .on("click", () => window.open(project.link, "_blank"));
    }

  right.append("p")
    .text(`${project.dateCompleted.replace("-", "•") || ""} || ${project.tools.replaceAll(",", "•") || ""}`)
    .style("font-size", "0.7rem")
    .style("alighn", "center")
    .style("color", "#aaa")
    .style("margin", "0");



 
   
  //add a horizontal line here
  right.append("hr")
  .style("border", "0")
  .style("height", "1px")
  .style("background", "#555")
  .style("margin", "10px 0");

  right.append("p")
    .text(project.line || "No description provided.")
    .style("font-size", "0.95rem")
    .style("line-height", "1.4");

  if (project.insights && project.insights.length > 0) {
    const insightsDiv = right.append("div");
    insightsDiv.append("p")
      .text(project.insights)
      .style("font-size", "0.95rem")
      .style("margin-bottom", "5px");

  }

 
  function closeOverlay() {
    overlay.remove();
    if (location.hash) history.back(); // let back button clear the hash/state
  }
  

  // Close on Escape
  d3.select(window)
    .on("keydown.videoOverlay", (e) => {
      if (e.key === "Escape") closeOverlay();
    });
}

  

//if only design, make it on the left instead of the right.
function showGifWithAnimation(event, project) {
    // Ensure the GIF source is dynamically set based on the provided path
    const gifSource = `assets/${project.projectName.toLowerCase().replaceAll(" ", "-")}/loop.mp4`;
   
    // Create the container for the GIF (circle with radius animation)
    const circleContainer = d3.select("body")
        .append("div")
        .attr("id", "gifContainer")
        .style("width", "0px") // Start with 0 size
        .style("height", "0px") // Start with 0 size
        .style("border-radius", "50px")
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
      let targetLeft, targetTop = initialY - 250;

      if (project.categories.includes("Data")) {
        // show on right
        targetLeft = initialX + 100;
      } else {
        // show on left
        targetLeft = initialX - 100 - 480; // subtract gif width
      }
      
      circleContainer.transition()
        .duration(500)
        .style("width", "480px")
        .style("height", "300px")
        .style("left", `${targetLeft}px`)
        .style("top", `${targetTop}px`)
        .on("end", () => {
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


function openFromHash() {
  const slug = location.hash.replace(/^#/, '');
  if (!slug) return;
  const p = bySlug(slug);
  if (p) showProjectModal(p);
}


window.addEventListener('popstate', () => {
  const slug = location.hash.replace(/^#/, '');
  const overlay = d3.select("#videoOverlay").node();
  if (!slug && overlay) {
    // hash cleared → close
    d3.select("#videoOverlay").remove();
    return;
  }
  if (slug) {
    const current = d3.select("#videoOverlay").attr("data-slug");
    if (current !== slug) {
      d3.select("#videoOverlay").remove();
      const p = bySlug(slug);
      if (p) showProjectModal(p);
    }
  }
});
