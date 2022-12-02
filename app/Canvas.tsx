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
    const M = 3;
    const r = 400;
    const theta = (2 * Math.PI) / Math.pow(2, M);

    useEffect(() => {
        let ticks = [];
        for (let i = 0; i < Math.pow(2, M); i++) {
            ticks.push('');
        }
        setTicks(ticks);
    }, []);

    const addNode = () => {
        let id = Math.floor(Math.random() * Math.pow(2, M));
        let coords = {
            x: r * Math.cos(id * theta - Math.PI / 2) + 500,
            y: r * Math.sin(id * theta - Math.PI / 2) + 500,
        };

        let newNode: ChordNode = {
            id,
            coords,
            fingerTable: generateFingerTable(id),
        };

        setNodesData([...nodesData, newNode]);
    };

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
            .join('line')
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
    }, [ticks]);

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
        </div>
    );
}
