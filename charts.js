// Define svg variables
let barSvg, scatterSvg, lineSvg;

// Load data from CSV file
d3.csv('atl_weather_20to22.csv').then(data => {
    createBarChart(data);
    createScatterplot(data);
    createLineGraph(data);
    createCharts(data)
}).catch(error => {
    console.error('Error loading data:', error);
});



// Bar Chart
function createBarChart(weatherData) {
    weatherData.forEach(d => {
        d.Date = new Date(d.Date);
        d.Precip = +d.Precip;
    });
    
    // Group data by month and sum the precipitation
    const dataByMonth = d3.rollup(
        weatherData,
        v => d3.sum(v, d => d.Precip),
        d => d3.timeFormat('%B')(d.Date)
    );

    // Convert grouped data to an array
    const aggregatedData = Array.from(dataByMonth, ([month, totalPrecipitation]) => ({ month, totalPrecipitation }));

    // Set up SVG container and scales
    const width = 600;
    const height = 400;
    const margin = { top: 50, right: 50, bottom: 50, left: 60 }; 

    // Create SVG element
    barSvg = d3.select('#barChart').append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add tooltip
    const tooltip = d3.select('#barChart').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Create X and Y scales
    const xScale = d3.scaleBand()
        .domain(aggregatedData.map(d => d.month))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, d => d.totalPrecipitation)])
        .range([height - margin.bottom, margin.top]);

    // Draw bars with tooltip
    barSvg.selectAll('rect')
    .data(aggregatedData)
    .enter().append('rect')
    .attr('x', d => xScale(d.month))
    .attr('y', d => yScale(d.totalPrecipitation))
    .attr('width', xScale.bandwidth())
    .attr('height', d => height - margin.bottom - yScale(d.totalPrecipitation))
    .attr('fill', 'steelblue')
    .on('mouseover', function (event, d) {
        const month = d.month;
        const totalPrecipitation = d.totalPrecipitation;

        // Round the numbers to two decimal places
        const roundedPrecipitation = totalPrecipitation.toFixed(2);

        // Highlight the bar being hovered over
        d3.select(this).attr('fill', 'orange');

        tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);

        tooltip.html(`Month: ${month}<br>Total Precipitation: ${roundedPrecipitation}`)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function () {
        // Restore the original fill color on mouseout
        d3.select(this).attr('fill', 'steelblue');

        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    });

    // Draw axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Append X axis
    barSvg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    // X axis title
    barSvg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 5) 
        .style('text-anchor', 'middle')
        .text('Month');

    // Append Y axis
    barSvg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis);

    // Y axis title
    barSvg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', margin.left - 40) 
        .style('text-anchor', 'middle')
        .text('Total Precipitation');

    // Legend
    const legend = barSvg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right}, ${margin.top})`);

    legend.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('y', -10)
        .attr('fill', 'steelblue');

    legend.append('text')
        .attr('x', -80)
        .attr('y', -30)
        .attr('dy', '.35em')
        .style('text-anchor', 'start')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Monthly Precipitation');
}



// Scatterplot
function createScatterplot(weatherData) {
    const width = 600;
    const height = 400;
    const margin = { top: 50, right: 20, bottom: 50, left: 60 };

    // Parse the dates and convert numeric values
    weatherData.forEach(d => {
        d.Date = new Date(d.Date);
        d.Precip = +d.Precip;
        d.Dewpoint = +d.Dewpoint;
        d.Pressure = +d.Pressure;
        d.Visibility = +d.Visibility;
        d.Windspeed = +d.Windspeed;
        d.MaxSpeed = +d.MaxSpeed;
        d.TempMax = +d.TempMax;
        d.TempMin = +d.TempMin;
    });

    // Calculate TempDiff
    weatherData.forEach(d => {
        d.TempDiff = d.TempMax - d.TempMin;
    });

    // Select default variables for the scatterplot
    let xVariable = 'Pressure';
    let yVariable = 'Dewpoint';

    // Set up initial scales
    const xScale = d3.scaleLinear()
        .domain([d3.min(weatherData, d => d[xVariable]), d3.max(weatherData, d => d[xVariable])])
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(weatherData, d => d[yVariable]), d3.max(weatherData, d => d[yVariable])])
        .range([height - margin.bottom, margin.top]);

    const radiusScale = d3.scaleLinear()
        .domain(d3.extent(weatherData, d => d.Precip))
        .range([3, 20]);

    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(weatherData, d => d.TempDiff));

    // Create dropdown control panel
    const dropdown = d3.select('#scatterplot').append('select')
        .attr('id', 'configDropdown')
        .style('position', 'absolute')
        .style('top', '10px')
        .style('right', '10px') 
        .on('change', updateScatterplot);

    dropdown.selectAll('option')
        .data(['Pressure vs Dewpoint', 'Pressure vs Visibility'])
        .enter().append('option')
        .text(d => d);


    // Function to create size legend
    function createSizeLegend(svg, radiusScale) {
        const sizeLegend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - margin.right - 70}, ${height - margin.bottom - 10})`);

        sizeLegend.append('text')
            .attr('x', 5)
            .attr('y', -130)
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .text('Precipitation');

        sizeLegend.selectAll('circle')
            .data([1, 3, 5])
            .enter().append('circle')
            .attr('cx', 30)
            .attr('cy', (d, i) => -15 - i * 40)
            .attr('r', d => radiusScale(d))
            .attr('stroke', 'black');

        sizeLegend.selectAll('text')
            .data([0, 1.0, 3.0, 5.0])
            .enter().append('text')
            .attr('x', 65)
            .attr('y', (d, i) => 30 - i * 40)
            .style('text-anchor', 'start')
            .style('font-size', '12px')
            .text(d => ` ${d.toFixed(1)}`);
    }
    

    function updateScatterplot() {
        const selectedOption = dropdown.property('value');
    
        if (selectedOption === 'Pressure vs Dewpoint') {
            yVariable = 'Dewpoint';
        } else if (selectedOption === 'Pressure vs Visibility') {
            yVariable = 'Visibility';
        }
    
        // Update scales based on selected variables
        yScale.domain([d3.min(weatherData, d => d[yVariable]), d3.max(weatherData, d => d[yVariable])]);
    
        // Redraw circles and axes
        svg.selectAll('.data-circle')
            .attr('cy', d => yScale(d[yVariable]))
            .attr('fill', d => colorScale(d.TempDiff))
            .attr('stroke', 'none');
    
        svg.select('.y-axis')
            .call(yAxis);
    
        // Update y-axis title
        svg.select('.y-axis-title')
            .text(yVariable);
    
        // Redraw size legend
        svg.select('.legend').remove(); // Remove existing legend
        createSizeLegend(svg, radiusScale); // Create new legend
    }
    
    
    // Draw circles in the scatterplot with varying size, opacity, and color
        const svg = d3.select('#scatterplot').append('svg')
        .attr('width', width)
        .attr('height', height);


    // Define the brush
    const brush = d3.brush()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on('end', brushed);

    // Append brush to the svg
    const gBrush = svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Draw the circles representing data points
        const dataCircles = svg.selectAll('.data-circle')
        .data(weatherData)
        .enter().append('circle')
        .attr('class', 'data-circle')
        .attr('cx', d => xScale(d[xVariable]))
        .attr('cy', d => yScale(d[yVariable]))
        .attr('r', d => radiusScale(d.Precip))
        .attr('fill', d => colorScale(d.TempDiff))
        .attr('opacity', 0.8)
        .on('mouseover', handleMouseOver)
        .on('mouseout', handleMouseOut);

        // Draw the size legend
    createSizeLegend(svg, radiusScale);

    function brushed() {
        const selection = d3.event.selection;
        
        // If no selection, revert to initial data
        if (!selection) return;

        // Convert the pixel positions to data values
        const [[x0, y0], [x1, y1]] = selection.map(d => [xScale.invert(d[0]), yScale.invert(d[1])]);

        // Filter data based on the brush selection
        const brushedData = weatherData.filter(d =>
            d[xVariable] >= x0 && d[xVariable] <= x1 &&
            d[yVariable] >= y0 && d[yVariable] <= y1
        );

        // Update the line graph with brushed data
        updateLineGraph(brushedData);
    }

    // Draw axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Append X axis
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    // X axis title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 5)
        .style('text-anchor', 'middle')
        .text(xVariable);

    // Append Y axis
    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis);

    // Y axis title
    svg.append('text')
        .attr('class', 'y-axis-title')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', margin.left - 40)
        .style('text-anchor', 'middle')
        .text(yVariable);

    // Add color legend
    const colorLegend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 100}, 20)`);

    const colorStops = d3.range(0, 1.1, 0.1);

    colorLegend.append('linearGradient')
        .attr('id', 'colorLegendGradient')
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', 100)
        .selectAll('stop')
        .data(colorStops)
        .enter().append('stop')
        .attr('offset', (d, i) => `${i * 100 / (colorStops.length - 1)}%`)
        .attr('stop-color', d => d3.interpolateViridis(d));

    colorLegend.append('rect')
        .attr('width', 20)
        .attr('height', 100)
        .attr('fill', 'url(#colorLegendGradient)');

    colorLegend.append('text')
        .attr('x', -160)
        .attr('y', -10)
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Difference in Max and Min Temperatures');

    colorLegend.append('text')
        .attr('x', 30)
        .attr('y', 10)
        .style('font-size', '10px')
        .text('Low');

    colorLegend.append('text')
        .attr('x', 30)
        .attr('y', 95)
        .style('font-size', '10px')
        .text('High');


    // Define mouseover event handler for scatterplot
    function handleMouseOver(event, d) {
        // Highlight the point on hover
        d3.select(this)
            .attr('stroke', 'black')
            .attr('stroke-width', 3);

        // Exclude legend circles from the selection
        svg.selectAll('.data-circle')
            .attr('fill-opacity', 0.2); 
        d3.select(this)
            .attr('fill-opacity', 1); 

        // Find corresponding data point in line graph
        const correspondingDataPoint = weatherData.find(dataPoint => dataPoint.Date.getTime() === d.Date.getTime());

        // Show values in a tooltip for line graph
        const tooltipLineGraph = d3.select('#lineGraph').select('.tooltip');
        tooltipLineGraph.transition()
            .duration(200)
            .style('opacity', 0.9);

        tooltipLineGraph.html(`Date: ${correspondingDataPoint.Date.toDateString()}<br>Max Temperature: ${correspondingDataPoint.TempMax}°F<br>Min Temperature: ${correspondingDataPoint.TempMin}°F`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 20) + 'px');
    }



// Define mouseout event handler for scatterplot
function handleMouseOut(event, d) {
    // Remove highlight on mouseout
    d3.select(this)
        .attr('stroke', 'none');

    // Hide the tooltip for line graph
    d3.select('#lineGraph').select('.tooltip')
        .transition()
        .duration(500)
        .style('opacity', 0);
}

// Define mouseover event handler for line graph
function handleMouseOverLineGraph(event, d) {
    // Highlight the corresponding point in the scatterplot
    const correspondingPoint = svg.select(`circle[data-date="${d.Date.toISOString()}"]`);
    correspondingPoint.attr('stroke', 'black').attr('stroke-width', 3);

    // Show the tooltip for line graph on hover
    const tooltipLineGraph = d3.select('#lineGraph').select('.tooltip');
    tooltipLineGraph.transition()
        .duration(200)
        .style('opacity', 0.9);

    tooltipLineGraph.html(`Date: ${d.Date.toDateString()}<br>Max Temperature: ${d.TempMax}°F<br>Min Temperature: ${d.TempMin}°F`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px');
}

// Define mouseout event handler for line graph
function handleMouseOutLineGraph(event, d) {
    // Remove highlight from the corresponding point in the scatterplot
    const correspondingPoint = svg.select(`circle[data-date="${d.Date.toISOString()}"]`);
    correspondingPoint.attr('stroke', 'none');

    // Hide the tooltip for line graph on mouseout
    d3.select('#lineGraph').select('.tooltip')
        .transition()
        .duration(500)
        .style('opacity', 0);
}
}

// Function to update line graph based on brushed data
function updateLineGraph(data) {
    // Remove existing lines
    svg.selectAll('.line').remove();

    // Create new lines based on brushed data
    const lineTempMax = d3.line()
        .x(d => xScale(d.Date))
        .y(d => yScale(d.TempMax));

    const lineTempMin = d3.line()
        .x(d => xScale(d.Date))
        .y(d => yScale(d.TempMin));

    svg.append('path')
        .datum(data)
        .attr('class', 'line line-temp-max') 
        .attr('d', lineTempMax);

    svg.append('path')
        .datum(data)
        .attr('class', 'line line-temp-min') 
        .attr('d', lineTempMin);

}







// Line Graph
function createLineGraph(weatherData) {
    // Parse date and temperature values
    weatherData.forEach(d => {
        d.Date = new Date(d.Date);
        d.TempMax = +d.TempMax;
        d.TempMin = +d.TempMin;
    });

    // Define dimensions and margins
    const margin = { top: 10, right: 80, bottom: 50, left: 80 };
    const fullWidth = window.innerWidth;
    const width = fullWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    // Create SVG element for the line graph
    const svg = d3.select('#lineGraph').append('svg')
        .attr('width', fullWidth)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define x and y scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(weatherData, d => d.Date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(weatherData, d => d.TempMin), d3.max(weatherData, d => d.TempMax)])
        .range([height, 0]);

    // Define line functions for max and min temperatures
    const lineTempMax = d3.line()
        .x(d => xScale(d.Date))
        .y(d => yScale(d.TempMax));

    const lineTempMin = d3.line()
        .x(d => xScale(d.Date))
        .y(d => yScale(d.TempMin));

    // Append lines to the SVG for max and min temperatures
    svg.append('path')
        .datum(weatherData)
        .attr('class', 'line line-temp-max')
        .attr('d', lineTempMax);

    svg.append('path')
        .datum(weatherData)
        .attr('class', 'line line-temp-min')
        .attr('d', lineTempMin);

    // Append x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis);

    svg.append('g')
        .call(yAxis);

    // Append axis labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.top + 25)
        .style('text-anchor', 'middle')
        .text('Date');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Temperature (°F)');

    // Append circles for each data point
    svg.selectAll('.dot')
    .data(weatherData)
    .enter().append('circle')
    .attr('class', 'dot')
    .attr('cx', d => xScale(d.Date))
    .attr('cy', d => yScale((d.TempMax + d.TempMin) / 2))
    .attr('r', 5)
    .style('fill', 'white') 

    .style('fill-opacity', 0) 
    .on('mouseover', handleMouseOverLineGraph)
    .on('mouseout', handleMouseOutLineGraph);


    // Append legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right}, ${margin.top})`);

    legend.append('path')
        .attr('class', 'line line-temp-max')
        .attr('d', 'M0,5L30,5')
        .attr('stroke', 'steelblue');

    legend.append('text')
        .attr('x', 35)
        .attr('y', 9)
        .attr('dy', '.35em')
        .style('text-anchor', 'start')
        .text('Max Temperature');

    legend.append('path')
        .attr('class', 'line line-temp-min')
        .attr('d', 'M0,25L30,25')
        .attr('stroke', 'orange');

    legend.append('text')
        .attr('x', 35)
        .attr('y', 29)
        .attr('dy', '.35em')
        .style('text-anchor', 'start')
        .text('Min Temperature');

    // Append tooltip
    const tooltipLineGraph = d3.select('#lineGraph').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('padding', '5px')
        .style('border', '1px solid #ddd')
        .style('border-radius', '5px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

    // Define mouseover event handler
    function handleMouseOverLineGraph(event, d) {
        if (d3.select(this).style('fill') === 'rgb(0, 0, 0)') {
            d3.select(this)
                .attr('fill-opacity', 0);
        }

        // Show values in a tooltip
        tooltipLineGraph.transition()
            .duration(200)
            .style('opacity', 0.9);

        tooltipLineGraph.html(`Date: ${d.Date.toDateString()}<br>Max Temperature: ${d.TempMax}°F<br>Min Temperature: ${d.TempMin}°F`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 20) + 'px');
    }

    // Define mouseout event handler
    function handleMouseOutLineGraph(event, d) {
        d3.select(this)
            .attr('fill-opacity', 1);

        tooltipLineGraph.transition()
            .duration(500)
            .style('opacity', 0);
    }
}


function createCharts(data) {
    // Convert Date strings to Date objects
    data.forEach(function(d) {
        d.Date = new Date(d.Date);
        d.Dewpoint = +d.Dewpoint; 
        d.TempMin = +d.TempMin; 
        d.TempMax = +d.TempMax;
    });

    var margin = { top: 40, right: 20, bottom: 60, left: 50 };
    var width = 600 - margin.left - margin.right;
    var height = 300 - margin.top - margin.bottom;

    var x = d3.scaleTime().range([0, width]);
    var y1 = d3.scaleLinear().range([height, 0]);
    var y2 = d3.scaleLinear().range([height, 0]);

    var xAxis = d3.axisBottom(x);
    var yAxis1 = d3.axisLeft(y1);
    var yAxis2 = d3.axisRight(y2);

    var svg1 = d3.select("#chart1 svg");
    var svg2 = d3.select("#chart2 svg");

    if (svg1.empty()) {
        svg1 = d3.select("#chart1")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    }

    if (svg2.empty()) {
        svg2 = d3.select("#chart2")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    }

    x.domain(d3.extent(data, function(d) { return d.Date; }));
    y1.domain([0, d3.max(data, function(d) { return d.Dewpoint; })]);
    y2.domain([d3.min(data, function(d) { return d.TempMin; }), d3.max(data, function(d) { return d.TempMax; })]);

    svg1.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot unhighlighted")
    .attr("cx", function(d) { return x(d.Date); })
    .attr("cy", function(d) { return y1(d.Dewpoint); })
    .attr("r", 3)
    .on("mouseover", function(event, d) {
        var correspondingDate = d.Date;
        svg1.selectAll(".dot")
            .classed("highlighted", function(d2) {
                return d2.Date.getTime() === correspondingDate.getTime();
            })
            .attr("r", function(d2) {
                return d2.Date.getTime() === correspondingDate.getTime() ? 10 : 3;
            });
        svg2.selectAll(".dot")
            .classed("highlighted", function(d2) {
                return d2.Date.getTime() === correspondingDate.getTime();
            })
            .attr("r", function(d2) {
                return d2.Date.getTime() === correspondingDate.getTime() ? 10 : 3;
            });
        showTooltip(event, d);
    })
    .on("mouseout", function() {
        svg1.selectAll(".dot").classed("highlighted", false).attr("r", 3);
        svg2.selectAll(".dot").classed("highlighted", false).attr("r", 3);
        hideTooltip(); 
    });

    svg2.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot unhighlighted")
        .attr("cx", function(d) { return x(d.Date); })
        .attr("cy", function(d) { return y2(d.TempMax); })
        .attr("r", 3)
        .on("mouseover", function(event, d) {
            var correspondingDate = d.Date;
            svg1.selectAll(".dot")
                .classed("highlighted", function(d2) {
                    return d2.Date.getTime() === correspondingDate.getTime();
                })
                .attr("r", function(d2) {
                    return d2.Date.getTime() === correspondingDate.getTime() ? 10 : 3;
                });
            svg2.selectAll(".dot")
                .classed("highlighted", function(d2) {
                    return d2.Date.getTime() === correspondingDate.getTime();
                })
                .attr("r", function(d2) {
                    return d2.Date.getTime() === correspondingDate.getTime() ? 10 : 3;
                });
            showTooltip(event, d); 
        })
        .on("mouseout", function() {
            svg1.selectAll(".dot").classed("highlighted", false).attr("r", 3);
            svg2.selectAll(".dot").classed("highlighted", false).attr("r", 3);
            hideTooltip(); 
        });




    svg1.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 10)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("Date");

    svg1.append("g")
        .attr("class", "y axis")
        .call(yAxis1)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("Dewpoint");

    svg2.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 10)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("Date");

    svg2.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + width + ",0)")
        .call(yAxis2)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -25)
        .attr("x", -height / 2)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("Temperature");

    // Chart titles
    svg1.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text("Dewpoint over Time");

    svg2.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text("Temperature Range over Time");

    // Legend
    svg1.append("circle").attr("cx", width - 100).attr("cy", 10).attr("r", 5).style("fill", "steelblue");
    svg1.append("text").attr("x", width - 90).attr("y", 10).text("Data").style("font-size", "12px").attr("alignment-baseline", "middle");
    svg1.append("circle").attr("cx", width - 100).attr("cy", 30).attr("r", 5).style("fill", "red");
    svg1.append("text").attr("x", width - 90).attr("y", 30).text("Selected").style("font-size", "12px");
}

function showTooltip(event, data) {
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("opacity", 0.9);
        
    tooltip.transition()
        .duration(200)
        .style('opacity', 0.9);

    var formatDate = d3.timeFormat("%Y-%m-%d");
    var formattedDate = formatDate(data.Date); // Format date without time

    tooltip.html("Date: " + formattedDate + "<br/>" +
        "Dewpoint: " + data.Dewpoint + "<br/>" +
        "Min Temperature: " + data.TempMin + "<br/>" +
        "Max Temperature: " + data.TempMax)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
}



function hideTooltip() {
    d3.select(".tooltip").remove();
}

