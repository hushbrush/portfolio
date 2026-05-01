// add an if that checks if it's only design and then the hover video plays on the left instead of the right.

const colors ={ projectCircles: "#000000"}; 

let projects = [];                           // <— add this
let mobileProjectVisibleCount = 3;
let activeWorkFilter = "client";
let currentVennSimulation = null;
let vennResizeTimer = null;
const slugify = s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
const bySlug  = slug => projects.find(p => slugify(p.projectName) === slug);
const dottedList = value => String(value || "").replace(/,/g, "•");
const parseProjectMonth = value => {
    const match = String(value || "").match(/^(\d{4})-(\d{1,2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};
const hasClient = project => String(project.client || "").trim().length > 0;
const getFilteredProjects = () => {
    if (activeWorkFilter === "recent") {
      const today = new Date();
      return projects.filter(project => {
        const projectDate = parseProjectMonth(project.dateCompleted);
        const months = (today.getFullYear() - projectDate.getFullYear()) * 12 + (today.getMonth() - projectDate.getMonth());
        return months >= 0 && months <= 12;
      });
    }
    if (activeWorkFilter === "client") return projects.filter(hasClient);
    return projects;
};
const getClientName = project => String(project.client || "").trim();
const getClientLabel = project => getClientName(project).toUpperCase();
const getMonthsSinceProject = project => {
  const projectDate = parseProjectMonth(project.dateCompleted);
  const today = new Date();
  const months = (today.getFullYear() - projectDate.getFullYear()) * 12 + (today.getMonth() - projectDate.getMonth());
  return Math.max(0, months);
};
const getRecentLabel = project => {
  const months = getMonthsSinceProject(project);
  return `${months} ${months === 1 ? "MONTH" : "MONTHS"} AGO`;
};
const getProjectLabel = project => {
  if (activeWorkFilter === "client") return getClientLabel(project);
  if (activeWorkFilter === "recent") return getRecentLabel(project);
  return "";
};
const estimateLabelWidth = label => Math.min(260, Math.max(72, label.length * 8.2));
const getPreviewMedia = project => {
  if (project.previewVideo || project.hoverVideo) {
    return { type: "video", src: project.previewVideo || project.hoverVideo };
  }
  if (slugify(project.projectName).includes("jurisee")) {
    return { type: "video", src: "assets/jurisee/loop.mp4" };
  }
  return { type: "video", src: `assets/${slugify(project.projectName)}/loop.mp4` };
};
const circleOpacityForProjects = (circleId, projectList) =>
  projectList.some(project => (project.categories || "").toLowerCase().includes(circleId)) ? 1 : 0.3;



landingPage();
setupMobileNav();
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
        setupWorkFilters();
        renderFilteredWork();
        setupResponsiveRendering();

        // 🔑 Now that projects exist, try opening modal from hash
        openFromHash();
    })
    .catch(error => {
        console.error('Error fetching or parsing data.json:', error);
    });

function setupResponsiveRendering() {
  window.addEventListener("resize", () => {
    window.clearTimeout(vennResizeTimer);
    vennResizeTimer = window.setTimeout(() => {
      renderFilteredWork();
      landingPage();
    }, 180);
  });
}

function setupWorkFilters() {
  const buttons = document.querySelectorAll(".work-filter");
  if (!buttons.length) return;

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      activeWorkFilter = button.dataset.filter || "all";
      mobileProjectVisibleCount = activeWorkFilter === "recent" ? 3 : mobileProjectVisibleCount;
      buttons.forEach(btn => {
        const isActive = btn === button;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", String(isActive));
      });
      renderFilteredWork();
    });
    button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
  });
}

function renderFilteredWork() {
  const filteredProjects = getFilteredProjects().map(project => ({ ...project }));
  if (filteredProjects.length) generateCircleAttributes(filteredProjects);
  renderVennDiagram(filteredProjects);
  renderMobileProjectCards(projects);
}

function setupMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#headerSection nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}



// Create a function to determine the size of each project circle
function generateCircleAttributes(projects) {
    const maxSize = 80; // Maximum circle radius
    const minSize = 30; // Minimum circle radius

    // Determine the date range
    const newestDate = new Date(
        Math.max(...projects.map(project => parseProjectMonth(project.dateCompleted)))
    );
    const oldestDate = new Date(
        Math.min(...projects.map(project => parseProjectMonth(project.dateCompleted)))
    );
    const dateRange = newestDate - oldestDate || 1;

    projects.forEach(project => {
        const projectDate = parseProjectMonth(project.dateCompleted);
        const size =
            ((projectDate - oldestDate) / dateRange) * (maxSize - minSize) +
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


function assignProjectPositions(projects, vennCircles, svgWidth, svgHeight) {
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
        } else {
            project.targetX = svgWidth / 2;
            project.targetY = svgHeight / 2;
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
        const dist = Math.hypot(dx, dy) || 0.0001;
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
      const container = d3.select("#vennDiagram");
      container.selectAll("svg").remove();
      if (currentVennSimulation) currentVennSimulation.stop();
      if (!projects.length) return;

      if (window.matchMedia("(max-width: 900px)").matches) return;

      const containerNode = container.node();
      const svgWidth  = (containerNode && containerNode.clientWidth) || window.innerWidth;
      const circleRadius = Math.max(260, Math.min(430, (svgWidth - 140) / 3));
      const svgHeight = Math.max(window.innerHeight * 1.1, circleRadius * 2 + 180);
  
      // SVG setup
      const svg = container
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
            .attr("xlink:href", `assets/thumbnails/${safe}.png`)
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
          .attr("stroke","black")
          .attr("stroke-width", 2)
          .style("opacity", d => circleOpacityForProjects(d.id, projects));
  
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
          .attr("fill","black")
          .style("opacity", d => circleOpacityForProjects(d.id, projects));

      // 3) assign project target positions…
      assignProjectPositions(projects, vennCircles, svgWidth, svgHeight);
      projects.forEach(project => {
        project.x = svgWidth / 2;
        project.y = svgHeight / 2;
        project.vx = 0;
        project.vy = 0;
      });
      if (activeWorkFilter === "client" || activeWorkFilter === "recent") {
        projects.forEach(project => {
          project.projectLabel = getProjectLabel(project);
          project.projectLabelWidth = estimateLabelWidth(project.projectLabel);
          project.collisionSize = Math.max(project.size + 30, project.projectLabelWidth / 2 + 14);
        });
      }
  
      // 4) force simulation with two “wall” forces
      let projectLabels = null;
      if (activeWorkFilter === "client" || activeWorkFilter === "recent") {
        projectLabels = svg.selectAll(".project-label")
          .data(projects, d => d.projectName)
          .enter().append("g")
          .attr("class", "project-label")
          .style("pointer-events", "none");

        projectLabels.append("rect")
          .attr("x", d => -d.projectLabelWidth / 2 - 5)
          .attr("y", -2)
          .attr("width", d => d.projectLabelWidth + 10)
          .attr("height", 21)
          .attr("fill", "#fff");

        projectLabels.append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "hanging")
          .attr("fill", "#000")
          .style("font-family", "'bricolage-grotesque', sans-serif")
          .style("font-size", "14px")
          .style("font-weight", "700")
          .style("letter-spacing", "0")
          .text(d => d.projectLabel);
      }

      const simulation = d3.forceSimulation(projects)
        .force("x",         d3.forceX(d => d.targetX).strength(0.6))
        .force("y",         d3.forceY(d => d.targetY).strength(0.3))
        .force("collision", d3.forceCollide(d => d.collisionSize || d.size + 10).iterations(2))
  
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
                return `url(#thumb-${safe}) #f8f7fc`;
              })
              .attr("stroke","black")
              .attr("stroke-width",1)
              .attr("stroke-dasharray", "5 5")
              .style("cursor","pointer")
            .on("mouseenter", (e,d) => {
              svg.selectAll(".project-circle")
                .transition().duration(120)
                .style("opacity", node => node.projectName === d.projectName ? 1 : 0.3);
              if (projectLabels) {
                projectLabels
                  .transition().duration(120)
                  .style("opacity", node => node.projectName === d.projectName ? 1 : 0.3);
              }
              showHoverCard(e, d);
            //   changeCircleSize(e, d);
              // Then bind it to your circles:

              //make this circle 2 times its current size, with a transition, and an empty circle around it that grows along with the project circle. 
              //should I also make the other circles 50% opacity?
            })
            .on("mouseleave", (e,d) => {
              d3.select("#hoverPreviewCard").remove();
              svg.selectAll(".project-circle")
                .transition().duration(120)
                .style("opacity", 1);
              if (projectLabels) projectLabels.transition().duration(120).style("opacity", 1);
              d3.select(e.target).transition().duration(50).attr("r", d.size);
            //   changeCircleSize(e, d);
            })
            .on("click", (e,d) => {
              showProjectModal(d);
              const slug = slugify(d.projectName);
              if (location.hash !== `#${slug}`) history.pushState({ project: slug }, '', `#${slug}`);
            });

          if (projectLabels) {
            projectLabels.raise();
            projectLabels
              .attr("transform", d => `translate(${d.x - 20}, ${d.y - 20 + d.size + 18})`);
          }
            
            
        });
  
      simulation.alpha(1).restart();
      currentVennSimulation = simulation;
  }

function renderMobileProjectCards(projects) {
  const cards = d3.select("#mobileProjectCards");
  if (cards.empty()) return;

  cards.selectAll("*").remove();

  const sortedProjects = [...projects]
    .sort((a, b) => parseProjectMonth(b.dateCompleted) - parseProjectMonth(a.dateCompleted));
  const visibleProjects = sortedProjects.slice(0, mobileProjectVisibleCount);

  const card = cards
    .selectAll("button")
    .data(visibleProjects, d => d.projectName)
    .enter()
    .append("button")
    .attr("type", "button")
    .attr("class", "mobile-project-card")
    .on("click", (event, d) => {
      showProjectModal(d);
      const slug = slugify(d.projectName);
      if (location.hash !== `#${slug}`) history.pushState({ project: slug }, "", `#${slug}`);
    });

  card
    .append("img")
    .attr("src", d => `assets/thumbnails/${slugify(d.projectName)}.png`)
    .attr("alt", d => `${d.projectName} thumbnail`);

  card
    .append("span")
    .text(d => d.projectName);

  if (mobileProjectVisibleCount < sortedProjects.length) {
    cards
      .append("button")
      .attr("type", "button")
      .attr("class", "mobile-see-more")
      .text("See more")
      .on("click", () => {
        mobileProjectVisibleCount += 3;
        renderMobileProjectCards(projects);
      });
  }
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
const viewportPadding = 16;

  let tooltipLeft;
  if(categories.includes("Data"))
    tooltipLeft = event.pageX + offsetX;
 else 
  tooltipLeft = event.pageX - offsetX - tooltipWidth;
tooltipLeft = Math.max(
  viewportPadding,
  Math.min(tooltipLeft, window.scrollX + window.innerWidth - tooltipWidth - viewportPadding)
);

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

function showHoverCard(event, project) {
  const offsetX = 100;
  const cardWidth = 480;
  const cardPadding = 14;
  const mediaWidth = cardWidth - cardPadding * 2;
  const viewportPadding = 16;
  const categories = project.categories || "";
  const isData = categories.includes("Data") || categories.includes("data");
  const rawCardLeft = isData ? event.pageX + offsetX : event.pageX - offsetX - cardWidth;
  const cardLeft = Math.max(
    viewportPadding,
    Math.min(rawCardLeft, window.scrollX + window.innerWidth - cardWidth - viewportPadding)
  );
  const cardTop = event.pageY - 250;
  const media = getPreviewMedia(project);

  d3.select("#hoverPreviewCard").remove();

  const card = d3.select("body")
    .append("div")
    .attr("id", "hoverPreviewCard")
    .style("position", "absolute")
    .style("left", `${event.pageX}px`)
    .style("top", `${event.pageY}px`)
    .style("width", `${cardWidth}px`)
    .style("padding", `${cardPadding}px`)
    .style("background", "rgba(0,0,0,0.92)")
    .style("color", "white")
    .style("border-radius", "18px")
    .style("pointer-events", "none")
    .style("font-family", "bricolage-grotesque, sans-serif")
    .style("overflow", "hidden")
    .style("z-index", "1000")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "10px")
    .style("opacity", 0)
    .style("transform", "scale(0.08)")
    .style("transform-origin", "0 0");

  card.append("div")
    .style("font-weight", "700")
    .style("font-size", "18px")
    .style("line-height", "1.15")
    .text(project.projectName);

  const mediaWrap = card.append("div")
    .style("width", "100%")
    .style("height", `${mediaWidth / (16 / 9)}px`)
    .style("border-radius", "12px")
    .style("overflow", "hidden")
    .style("background", "#111");

  if (media.type === "youtube") {
    mediaWrap.append("iframe")
      .attr("src", media.src)
      .attr("allow", "autoplay; encrypted-media; picture-in-picture")
      .attr("allowfullscreen", true)
      .style("border", "0")
      .style("width", "100%")
      .style("height", "100%");
  } else {
    const video = mediaWrap.append("video")
      .attr("src", media.src)
      .attr("autoplay", true)
      .attr("loop", true)
      .attr("muted", true)
      .attr("playsinline", true)
      .style("width", "100%")
      .style("height", "100%")
      .style("object-fit", "cover");

    video.on("loadedmetadata", function() {
      const aspectRatio = this.videoWidth && this.videoHeight ? this.videoWidth / this.videoHeight : 16 / 9;
      mediaWrap
        .transition()
        .duration(180)
        .style("height", `${mediaWidth / aspectRatio}px`);
    });
  }

  card.append("div")
    .style("font-size", "13px")
    .style("font-weight", "300")
    .style("line-height", "1.35")
    .text(project.line || "");

  card
    .transition()
    .duration(240)
    .ease(d3.easeCubicOut)
    .style("left", `${cardLeft}px`)
    .style("top", `${cardTop}px`)
    .style("opacity", 1)
    .style("transform", "scale(1)");
}

function showProjectModal(project) {
  // Remove existing overlay if any
  d3.select("#videoOverlay").remove();
  const slug = slugify(project.projectName);
  const previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  // Create the full-screen dark background
  const overlay = d3.select("body")
    .append("div")
    .attr("id", "videoOverlay")
    .attr("data-slug", slug)
    .attr("class", "project-modal-overlay");

  // Main modal container
  const modal = overlay.append("div")
    .attr("class", "project-modal");

  // Close button
  modal.append("div")
    .attr("class", "project-modal-close")
    .attr("role", "button")
    .attr("aria-label", "Close project")
    .text("×")
    .on("click", closeOverlay);

  // LEFT SIDE: media (images/videos)
const left = modal.append("div")
  .attr("class", "project-modal-media");
console.log(project);

 
  (project.mediaLinks || []).forEach(link => {
    if (link.includes("youtube.com/embed") || link.includes("youtu.be")) {
      let wrapper = left.append("div")
        .attr("class", "project-modal-media-frame");

    wrapper.append("iframe")
      .attr("src", link)
      .attr("frameborder", "0")
      .attr("allow", "autoplay; encrypted-media; picture-in-picture")
      .attr("allowfullscreen", true);
    } else {
      left.append("img")
        .attr("src", link)
        .attr("alt", project.projectName || "");
    }
  });

  // RIGHT SIDE: project info
  const right = modal.append("div")
    .attr("class", "project-modal-info");

  right.append("p")
    .attr("class", "project-modal-title")
    .text(project.projectName || "Untitled Project")

  //add a horizontal line here
  right.append("hr")
    .attr("class", "project-modal-rule");

  right.append("p")
    .attr("class", "project-modal-meta")
    .text(`${String(project.dateCompleted || "").replace("-", "•")} || ${dottedList(project.tools)}`)

  if(project.link!=null)
    {
      right.append("button")
      .attr("class", "project-modal-launch")
      .text("Launch Project")
      .on("click", () => window.open(project.link, "_blank", "noopener,noreferrer"));
    }
 
   
  //add a horizontal line here
  right.append("hr")
    .attr("class", "project-modal-rule");

  right.append("p")
    .attr("class", "project-modal-description project-modal-desktop-copy")
    .text(project.line || "No description provided.")

  if (project.insights && project.insights.length > 0) {
    const insightsDiv = right.append("div");
    insightsDiv.append("p")
      .attr("class", "project-modal-insights project-modal-desktop-copy")
      .text(project.insights)

  }

  const mobileDetails = right.append("div")
    .attr("class", "project-modal-mobile-details");

  mobileDetails.append("details")
    .append("summary")
    .text("Overview");

  mobileDetails.select("details")
    .append("p")
    .attr("class", "project-modal-description")
    .text(project.line || "No description provided.");

  if (project.insights && project.insights.length > 0) {
    const details = mobileDetails.append("details");
    details.append("summary").text("Process");
    details.append("p")
      .attr("class", "project-modal-insights")
      .text(project.insights);
  }

 
  function closeOverlay() {
    overlay.remove();
    document.body.style.overflow = previousBodyOverflow;
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
    const gifSource = `assets/${slugify(project.projectName)}/loop.mp4`;
   
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
      targetLeft = Math.max(
        window.scrollX + 16,
        Math.min(targetLeft, window.scrollX + window.innerWidth - 480 - 16)
      );
      
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
    document.body.style.overflow = "";
    return;
  }
  if (slug) {
    const current = d3.select("#videoOverlay").attr("data-slug");
    if (current !== slug) {
      d3.select("#videoOverlay").remove();
      document.body.style.overflow = "";
      const p = bySlug(slug);
      if (p) showProjectModal(p);
    }
  }
});
