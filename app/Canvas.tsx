'use client';

import { useEffect, useRef, useState } from 'react';
import { select } from 'd3';

interface ChordNode {
    id: number;
    coords: {
        x: number;
        y: number;
    };
    fingerTable: Array<{ start: number; successor: number }>;
}

export default function Canvas() {
    const [ticks, setTicks] = useState<Array<String>>([]);
    const [nodesData, setNodesData] = useState<Array<ChordNode>>([]);
    const svgRef: any = useRef();
    const [M, setM] = useState<number>(3);
    const theta = (2 * Math.PI) / Math.pow(2, M);
    const r = 400;

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

        // Calculate coordinates
        let coords = {
            x: r * Math.cos(id * theta - Math.PI / 2) + 500,
            y: r * Math.sin(id * theta - Math.PI / 2) + 500,
        };

        // Add new node to nodesData
        setNodesData([
            ...nodesData,
            {
                id,
                coords,
                fingerTable: generateFingerTable(id),
            },
        ]);
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

    // Draws graph axes and ticks
    useEffect(() => {
        const svg = select(svgRef.current);

        const axisCircle = svg.append('g').attr('class', 'axisCircle');

        axisCircle
            .append('circle')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', r)
            .style('stroke', 'white');

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
            .style('stroke', (d) => (d === '' ? 'white' : 'red'));

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
            .attr('cx', (d) => d.coords.x)
            .attr('cy', (d) => d.coords.y)
            .attr('r', 20)
            .style('fill', 'blue');
    }, [nodesData]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <svg width="1000" height="1000" ref={svgRef} />

            <button onClick={addNode}>Add node</button>
            <input
                type="number"
                value={M}
                onChange={(e) => {
                    setM(parseInt(e.target.value));
                }}
            />
        </div>
    );
}
