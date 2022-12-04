'use client';

import { useEffect, useRef, useState } from 'react';
import { select } from 'd3';
import { Leva, useControls } from 'leva';

interface ChordNode {
    id: number;
    coords: {
        x: number;
        y: number;
    };
    fingerTable: Array<{ start: number; successor: number }>;
    keys: Array<number>;
}

export default function Canvas() {
    // Ref to svg element used for graph
    const svgRef: any = useRef();

    // Ticks around Chord chart circle
    const [ticks, setTicks] = useState<Array<String>>([]);
    // Data about nodes in network
    const [nodesData, setNodesData] = useState<Array<ChordNode>>([]);
    // M used to calculate possible id space 2 ^ M
    const [size, setSize] = useState<number>(0);

    // Chart setup controls
    const { M } = useControls('Chart setup', {
        M: { value: 4, min: 2, max: 9, step: 1 },
    });

    // Finger table controls
    const { hoverOnly, curveType } = useControls('Finger table', {
        hoverOnly: { label: 'Hover only', value: true },
        curveType: {
            label: 'Curve type',
            options: {
                'Curve (to Middle)': 0,
                'Curve (to ID)': 1,
                'Line (ID + Node)': 2,
                'Line (Node only)': 3,
                'Line (ID)': 4,
            },
        },
    });

    // Query controls
    const { showQueryOverlay, target, startNode } = useControls(
        'Query',
        {
            showQueryOverlay: { label: 'Show', value: false },
            target: {
                label: 'Target ID',
                value: Math.pow(2, M) / 2,
                min: 0,
                max: Math.pow(2, M),
                step: 1,
            },
            startNode: {
                label: 'Starting node',
                value: 0,
                min: 0,
                max: Math.pow(2, M),
                step: 1,
            },
        },
        [M]
    );

    // Quantized angle increments for polar coordinates
    const theta = (2 * Math.PI) / Math.pow(2, M);

    // Gets size of svg element
    const getSvgContainerSize = () => {
        setSize(
            Math.min(svgRef.current.clientWidth, svgRef.current.clientHeight)
        );
    };

    // Pay attention to svg size changes
    useEffect(() => {
        getSvgContainerSize();

        window.addEventListener('resize', getSvgContainerSize);

        return () => window.removeEventListener('resize', getSvgContainerSize);
    });

    // Adds a new node with random ID
    const addNode = () => {
        // Create array of nodeIds existing in network
        let nodeIds = nodesData.map((node) => node.id);

        // Do nothing if max number of nodes allowed in network
        if (nodeIds.length === Math.pow(2, M)) return;

        // Generate a new id until a new unused one is generated
        let id = Math.floor(Math.random() * Math.pow(2, M));
        while (nodeIds.includes(id))
            id = Math.floor(Math.random() * Math.pow(2, M));

        // Add new node to nodesData
        setNodesData([
            ...nodesData,
            {
                id,
                coords: getCoordinates(id),
                fingerTable: [],
                keys: [],
            },
        ]);
    };

    // Removes a random existing node
    const removeNode = () => {
        setNodesData((prev) => {
            let newData = [...prev];
            newData.splice(Math.floor(Math.random() * newData.length), 1);
            return newData;
        });
    };

    // Gets x and y coords for any particular ID
    const getCoordinates = (nodeId: number) => {
        return {
            x:
                (size / 2 - 100) * Math.cos(nodeId * theta - Math.PI / 2) +
                size / 2,
            y:
                (size / 2 - 100) * Math.sin(nodeId * theta - Math.PI / 2) +
                size / 2,
        };
    };

    // Determines if x is within [left, right), wrapping around with mod math at
    // 2^M
    const isWithinRange = (left: number, x: number, right: number) => {
        if (right > left) {
            return left <= x && x < right;
        } else if (left > right) {
            return (
                (left <= x && x < right + Math.pow(2, M)) ||
                (left - Math.pow(2, M) <= x && x < right)
            );
        }
    };

    // Generates the finger table for a given nodeId
    const generateFingerTable = (nodeId: number) => {
        let fingerTable = [];
        let nodeIds = nodesData.map((node) => node.id);

        // For each row in finger table
        for (let i = 1; i <= Math.pow(2, M) / 2; i *= 2) {
            // j used to search for succ
            let j = 0;
            let start = (nodeId + i) % Math.pow(2, M);
            let inserted = false;

            // Search until we find successor
            while (j < Math.pow(2, M)) {
                if (nodeIds.includes((nodeId + i + j) % Math.pow(2, M))) {
                    // If found, set this nodeId as successor to this start
                    // value
                    fingerTable.push({
                        start,
                        successor: (nodeId + i + j) % Math.pow(2, M),
                    });
                    inserted = true;
                    break;
                }
                j++;
            }

            // Otherwise set ourselves as the successor
            if (!inserted)
                fingerTable.push({
                    start: (nodeId + i) % Math.pow(2, M),
                    successor: nodeId,
                });
        }

        return fingerTable;
    };

    // Generates keys a particular node is responsible for depending on existing
    // predecessor
    const generateKeys = (nodeId: number) => {
        let keys = [];

        // If only node, this node keeps all keys
        if (nodesData.length === 1) {
            for (let i = 0; i < Math.pow(2, M); i++) keys.push(i);

            return keys;
        }

        let nodeIds = nodesData.map((node) => node.id).sort((a, b) => a - b);
        let predecessor = nodeId;

        // Get predecessor
        if (nodeId === nodeIds[0]) {
            keys.push(-1);
            predecessor = nodeIds[nodeIds.length - 1];
            let curr = predecessor % Math.pow(2, M);

            while (curr++ % Math.pow(2, M) != 0) keys.push(curr);
            curr = 0;
            keys.push(curr);
            while (curr <= nodeId) keys.push(curr++);
        } else {
            predecessor = nodeIds[nodeIds.findIndex((x) => x == nodeId) - 1];
            let curr = (predecessor + 1) % Math.pow(2, M);

            while (curr <= nodeId) keys.push(curr++);
        }

        return keys;
    };

    // Delete nodesData when M is changed
    useEffect(() => {
        setNodesData([]);
    }, [M, size]);

    // Regenerate ticks array when M is changed
    useEffect(() => {
        let ticks = [];
        for (let i = 0; i < Math.pow(2, M); i++) {
            ticks.push('');
        }
        setTicks(ticks);
    }, [M]);

    // Refresh finger tables when nodes change
    useEffect(() => {
        setNodesData((prev) => {
            let newData = prev;

            for (let i = 0; i < newData.length; i++) {
                newData[i].fingerTable = generateFingerTable(newData[i].id);
                newData[i].keys = generateKeys(newData[i].id);
            }

            return newData;
        });
    }, [nodesData]);

    // Draws graph axes and ticks
    useEffect(() => {
        const svg = select(svgRef.current);

        const axisCircle = svg.append('g').attr('class', 'axisCircle');

        // Circle for graph
        axisCircle
            .append('circle')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', size / 2 - 100)
            .style('stroke', 'var(--light3)')
            .style('fill', 'transparent');

        const axisTicks = svg.append('g').attr('class', 'axisTicks');

        // Ticks at each ID position around the graph
        axisTicks
            .selectAll('.axisTicks')
            .data(ticks)
            .enter()
            .append('line')
            .attr(
                'x1',
                (d, i) =>
                    (size / 2 - 100 - 10) * Math.cos(i * theta - Math.PI / 2) +
                    size / 2
            )
            .attr(
                'x2',
                (d, i) =>
                    (size / 2 - 100 + 10) * Math.cos(i * theta - Math.PI / 2) +
                    size / 2
            )
            .attr(
                'y1',
                (d, i) =>
                    (size / 2 - 100 - 10) * Math.sin(i * theta - Math.PI / 2) +
                    size / 2
            )
            .attr(
                'y2',
                (d, i) =>
                    (size / 2 - 100 + 10) * Math.sin(i * theta - Math.PI / 2) +
                    size / 2
            )
            .style('stroke', 'var(--light3)');

        // Remove all elements when needing to regenerate
        return () => {
            svg.selectAll('g').remove();
        };
    }, [ticks, M, size]);

    // Draw nodes
    useEffect(() => {
        const svg = select(svgRef.current);

        const nodes = svg.append('g').attr('class', 'nodes');

        nodes
            .selectAll('.nodes')
            .data(nodesData)
            .join('circle')
            .attr('id', (d) => 'id' + d.id)
            .attr('cx', (d) => d.coords.x)
            .attr('cy', (d) => d.coords.y)
            .attr('r', 20)
            .style('fill', 'var(--blue4)')
            .on('mouseover', (e, d) => {
                // Remove old overlay when new node is hovered if persistent
                if (!hoverOnly) {
                    nodes.selectAll('path').remove();
                    nodes.selectAll('text').remove();
                }

                // Change color of node circle
                select('#id' + d.id).style('fill', 'var(--red)');

                // Draw all connection lines
                for (let i = 0; i < d.fingerTable.length; i++) {
                    let curvePath;

                    // Change line style depending on user preference
                    switch (curveType) {
                        case 0:
                            curvePath = `M ${d.coords.x} ${d.coords.y}
                            Q ${size / 2} ${size / 2}
                              ${getCoordinates(d.fingerTable[i].successor).x}
                              ${getCoordinates(d.fingerTable[i].successor).y}`;

                            break;

                        case 1:
                            curvePath = `M ${d.coords.x} ${d.coords.y}
                            Q ${getCoordinates(d.fingerTable[i].start).x} 
                              ${getCoordinates(d.fingerTable[i].start).y}
                              ${getCoordinates(d.fingerTable[i].successor).x}
                              ${getCoordinates(d.fingerTable[i].successor).y}`;

                            break;

                        case 2:
                            curvePath = `M ${d.coords.x} ${d.coords.y}
                            L ${getCoordinates(d.fingerTable[i].start).x} 
                              ${getCoordinates(d.fingerTable[i].start).y}
                            L
                              ${getCoordinates(d.fingerTable[i].successor).x}
                              ${getCoordinates(d.fingerTable[i].successor).y}`;

                            break;

                        case 3:
                            curvePath = `M ${d.coords.x} ${d.coords.y}
                            L
                              ${getCoordinates(d.fingerTable[i].successor).x}
                              ${getCoordinates(d.fingerTable[i].successor).y}`;

                            break;

                        case 4:
                            curvePath = `M ${d.coords.x} ${d.coords.y}
                            L
                              ${getCoordinates(d.fingerTable[i].start).x}
                              ${getCoordinates(d.fingerTable[i].start).y}`;

                            break;

                        default:
                            curvePath = '';
                            break;
                    }

                    nodes
                        .append('path')
                        .attr('stroke', 'var(--red)')
                        .attr('stroke-width', '2px')
                        .attr('fill', 'transparent')
                        .attr('d', curvePath)
                        .attr('pointer-events', 'none');
                }

                // Header row of finger table
                nodes
                    .append('text')
                    .text('Start - Successor')
                    .attr('fill', 'var(--light3)')
                    .attr('id', 'text' + d.id)
                    .attr('x', d.coords.x + 50)
                    .attr('y', d.coords.y - 70)
                    .attr('pointer-events', 'none');

                // Draw each row in finger table
                for (let i = 0; i < d.fingerTable.length; i++) {
                    // Row text
                    nodes
                        .append('text')
                        .text(
                            `${d.fingerTable[i].start}  -  ${d.fingerTable[i].successor}`
                        )
                        .attr('fill', 'var(--light3)')
                        .attr('id', 'text' + d.id)
                        .attr('x', d.coords.x + 50)
                        .attr('y', d.coords.y - 40 + 30 * i)
                        .attr('z-index', '5')
                        .attr('pointer-events', 'none');
                }

                // Self ID
                nodes
                    .append('text')
                    .text(d.id)
                    .attr('fill', 'var(--light3)')
                    .attr('id', 'text' + d.id)
                    .attr('x', d.coords.x)
                    .attr('y', d.coords.y + 2)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-size', '1.5rem')
                    .attr('pointer-events', 'none');
            })
            .on('mouseout', (e, d) => {
                select('#id' + d.id).style('fill', 'var(--blue4)');
                // Remove overlay on mouseout if hover only
                if (hoverOnly) {
                    nodes.selectAll('text').remove();
                    nodes.selectAll('path').remove();
                }
            });

        // Remove elements when nodesData changes
        return () => {
            svg.selectAll('.nodes').remove();
        };
    }, [nodesData, curveType, hoverOnly, size]);

    // Create query route overlay based on query parameters
    useEffect(() => {
        const svg = select(svgRef.current);

        // Do nothing if user doesn't want to show query overlay
        if (!showQueryOverlay) return;

        let route = [startNode];
        let curr = startNode;
        let count = 0;

        // For each step in the route we add to route arr until we reach target node
        while (
            // While curr's keys doesn't include target
            !nodesData.find((x) => x.id === curr)?.keys.includes(target) &&
            // Max of 2^M jumps to prevent unexpected inf loop crashing
            count++ < Math.pow(2, M)
        ) {
            let currFingerTable = nodesData.find(
                (x) => x.id === curr
            )?.fingerTable;

            // Do nothing if we can't find finger table for some unexpected
            // reason
            if (!currFingerTable) return;

            // Check finger table and add appropriate node to route
            for (let i = 0; i < currFingerTable.length; i++) {
                if (
                    isWithinRange(
                        currFingerTable[i].start,
                        target,
                        i != currFingerTable.length - 1
                            ? currFingerTable[i + 1].start
                            : curr
                    )
                ) {
                    curr = currFingerTable[i].successor;
                    route.push(curr);
                    break;
                }
            }
        }

        const queryOverlay = svg.append('g').attr('class', 'queryOverlay');

        // Draw lines for each of the steps in route
        queryOverlay
            .selectAll('.queryOverlay')
            .data(route)
            .join('path')
            .attr(
                'd',
                (d, i) =>
                    `M${
                        i > 0
                            ? getCoordinates(route[i - 1]).x
                            : getCoordinates(d).x
                    }  ${
                        i > 0
                            ? getCoordinates(route[i - 1]).y
                            : getCoordinates(d).y
                    } L ${getCoordinates(d).x} ${getCoordinates(d).y}`
            )
            .attr('stroke', 'var(--green)')
            .attr('fill', 'transparent')
            .attr('pointer-events', 'none')
            .attr('stroke-width', '2px');

        return () => {
            svg.selectAll('.queryOverlay').remove();
        };
    }, [target, startNode, nodesData, showQueryOverlay, size]);

    // Query target and start node indicators
    useEffect(() => {
        const svg = select(svgRef.current);

        // Do nothing if user doesn't want to show query overlay
        if (!showQueryOverlay) return;

        const queryOverlay = svg.append('g').attr('class', 'targetOverlay');

        // Draw circles for target and startNode
        queryOverlay
            .selectAll('.targetOverlay')
            .data([target, startNode])
            .join('circle')
            .attr('cx', (d) => getCoordinates(d).x)
            .attr('cy', (d) => getCoordinates(d).y)
            .attr('r', 10)
            .attr('pointer-events', 'none')
            .style('fill', (d, i) => `var(--${i === 1 ? 'green' : 'red'})`);

        return () => {
            svg.selectAll('.targetOverlay').remove();
        };
    }, [target, startNode, nodesData, showQueryOverlay, size]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="leva-start">
                <Leva fill />
            </div>

            <div className="chart-container">
                <svg
                    ref={svgRef}
                    style={{ overflow: 'visible' }}
                    className="chord-svg"
                />
            </div>

            <div className="node-controls-container">
                <button onClick={addNode}>Add node</button>
                <button onClick={removeNode}>Remove node</button>
            </div>
        </div>
    );
}
