'use client';

import { useEffect, useRef, useState } from 'react';
import { select } from 'd3';
import { button, useControls } from 'leva';

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
    // Chord
    // Ticks around Chord chart circle
    const [ticks, setTicks] = useState<Array<String>>([]);
    // Data about nodes in network
    const [nodesData, setNodesData] = useState<Array<ChordNode>>([]);
    // M used to calculate possible id space 2 ^ M

    // Chart setup controls
    const { M, curveType } = useControls({
        M: { value: 3, min: 2, max: 9, step: 1 },
        curveType: { label: 'Curve type', value: 0, min: 0, max: 4, step: 1 },
    });

    // Query controls
    const { target, startNode } = useControls(
        {
            target: {
                label: 'Target node',
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
    // Radius from center the Chord graph's circle is
    const r = 400;
    // Type of curve for finger table lines

    const svgRef: any = useRef();

    // Delete nodesData when M is changed
    useEffect(() => {
        setNodesData([]);
    }, [M]);

    // Regenerate ticks array when M is changed
    useEffect(() => {
        let ticks = [];
        for (let i = 0; i < Math.pow(2, M); i++) {
            ticks.push('');
        }
        setTicks(ticks);
    }, [M]);

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
            let curr = (predecessor + 1) % Math.pow(2, M);

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

    // Draws graph axes and ticks
    useEffect(() => {
        const svg = select(svgRef.current);

        const axisCircle = svg.append('g').attr('class', 'axisCircle');

        axisCircle
            .append('circle')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', r)
            .style('stroke', 'var(--light3)')
            .style('fill', 'transparent');

        const axisTicks = svg.append('g').attr('class', 'axisTicks');

        axisTicks
            .selectAll('.axisTicks')
            .data(ticks)
            .enter()
            .append('line')
            .attr(
                'x1',
                (d, i) => (r - 10) * Math.cos(i * theta - Math.PI / 2) + 500
            )
            .attr(
                'x2',
                (d, i) => (r + 10) * Math.cos(i * theta - Math.PI / 2) + 500
            )
            .attr(
                'y1',
                (d, i) => (r - 10) * Math.sin(i * theta - Math.PI / 2) + 500
            )
            .attr(
                'y2',
                (d, i) => (r + 10) * Math.sin(i * theta - Math.PI / 2) + 500
            )
            .style('stroke', (d) =>
                d === '' ? 'var(--light3)' : 'var(--red)'
            );

        // Remove all elements when needing to regenerate
        return () => {
            svg.selectAll('g').remove();
        };
    }, [ticks, M]);

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
                // Change color of node circle
                select('#id' + d.id).style('fill', 'var(--red)');

                // Header row of finger table
                nodes
                    .append('text')
                    .text('Start - Successor')
                    .attr('fill', 'var(--light3)')
                    .attr('id', 'text' + d.id)
                    .attr('x', d.coords.x + 50)
                    .attr('y', d.coords.y - 70)
                    .attr('pointer-events', 'none');

                // Each row of finger table
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
                        .attr('pointer-events', 'none');

                    let curvePath;

                    switch (curveType) {
                        case 0:
                            curvePath = `M ${d.coords.x} ${d.coords.y}
                            Q 500 500
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
            })
            .on('mouseout', (e, d) => {
                select('#id' + d.id).style('fill', 'var(--blue4)');
                nodes.selectAll('text').remove();
                nodes.selectAll('path').remove();
            });

        // Remove elements when nodesData changes
        return () => {
            svg.selectAll('.nodes').remove();
        };
    }, [nodesData, curveType]);

    const getCoordinates = (nodeId: number) => {
        return {
            x: r * Math.cos(nodeId * theta - Math.PI / 2) + 500,
            y: r * Math.sin(nodeId * theta - Math.PI / 2) + 500,
        };
    };

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

    // Create overlay based on query parameters
    useEffect(() => {
        let route = [startNode];
        let curr = startNode;
        let count = 0;

        // While curr's keys doesn't include target
        while (
            !nodesData.find((x) => x.id === curr)?.keys.includes(target) &&
            count++ < 10
        ) {
            let currFingerTable = nodesData.find(
                (x) => x.id === curr
            )?.fingerTable;

            if (!currFingerTable) return;

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

        const svg = select(svgRef.current);

        const queryOverlay = svg.append('g').attr('class', 'queryOverlay');

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
    }, [target, startNode, nodesData]);

    useEffect(() => {
        const svg = select(svgRef.current);

        const queryOverlay = svg.append('g').attr('class', 'targetOverlay');

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
    }, [target, startNode, nodesData]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <svg
                width="1000"
                height="1000"
                ref={svgRef}
                style={{ overflow: 'visible' }}
            />

            <button onClick={addNode}>Add node</button>
            <br />
        </div>
    );
}
