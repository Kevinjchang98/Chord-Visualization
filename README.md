# Chord Algorithm Visualization

This is a visualization of the Chord algorithm/protocol used to create a peer to peer distributed hash table. It's created using [Next.js](https://nextjs.org/) and [d3.js](https://d3js.org/). This was for an extra credit assignment for Seattle University's Distributed Systems class.

## Features

### Chart Setup

The amount of possible IDs can be changed by modifying the value of $M$ in the chart setup area of the options panel. This refers to the Chord network having a range of $[0, 2^M)$

### Adding and Removing Nodes

Nodes are added or removed by clicking the buttons underneath the graph. Currently nodes are added at random places around the circle. A random existing node will be removed when the remove button is pressed. Finger tables are updated as the network changes due to nodes joining or leaving

### Finger Tables

Hover a node to view it's finger table and a visualization of its connections. A user can make the overlay persistent until another node is hovered by unchecking the "hover only" checkbox under the finger table options. The curve type can be changed as well.

### Query

The query overlay is hidden by default and can be shown by checking the show option in the query section of the options panel.

The target ID we're querying for can be chosen through the number input, and the node we're starting on can be chosen similarly. Currently the user can choose a starting node value that corresponds to an ID without a node, and nothing will show if that's the case; please choose a value for "starting node" that corresponds to some existing node in the network
