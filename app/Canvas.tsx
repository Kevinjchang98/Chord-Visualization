'use client';

import { useEffect, useRef } from 'react';
import { select } from 'd3';

export default function Canvas() {
    const svgRef: any = useRef();

    const data = ['a', 'b', 'c', 'd', 'e', 'f', 'f'];

    useEffect(() => {
        const svg = select(svgRef.current);

        let theta = (2 * Math.PI) / data.length;
        let r = 400;

        const axisCircle = svg.append('g').attr('class', 'axisCircle');

        axisCircle
            .append('circle')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', r)
            .style('stroke', 'white');

        const nodeCircles = svg.append('g').attr('class', 'nodeCircles');

        nodeCircles
            .selectAll('.nodeCircles')
            .data(data)
            .join('circle')
            .attr('cx', (d, i) => r * Math.cos(i * theta - Math.PI / 2) + 500)
            .attr('cy', (d, i) => r * Math.sin(i * theta - Math.PI / 2) + 500)
            .attr('r', 25)
            .style('fill', 'blue');
    }, [data]);

    return (
        <div>
            <svg width="1000" height="1000" ref={svgRef} />
        </div>
    );
}
