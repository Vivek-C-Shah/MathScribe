# MathScribe - Math Notes Bot

## Overview

**MathScribe** is a bot designed to solve mathematical and physics problems dynamically from whiteboard-style drawings. It works through a client-server architecture, where the user can interact with a canvas interface on the client-side to draw, add text, and solve math problems. Upon executing, the server-side processes the images using machine learning models (via APIs) to solve the problems and provide the correct answers. The server integrates tools such as Pillow (for image processing) and LLMs (Large Language Models) for problem analysis.

## Features

### Client-Side
The client-side offers an intuitive interface for users to draw and formulate their math problems. It includes the following features:

- **Canvas Tools:**
  - Pencil and eraser for freehand drawing.
  - Pre-defined shape tools to draw rectangles, circles, and triangles.
  - Adjustable stroke width for drawing precision.
  - Text tools: Add, drag, and delete text with adjustable font size.
  
- **Customization Options:**
  - Color swatches for changing drawing and text colors.
  
- **Undo, Redo, and Reset Functions:** 
  - Support for reversing or redoing actions and resetting the entire canvas.

- **Problem Solving:** 
  - Upon pressing the "Run" button, the drawing and problem descriptions are sent to the server. The server analyzes the image, solves the mathematical and physics problems, and returns the solution, which is displayed to the user.

### Server-Side
The server-side is responsible for analyzing the user-drawn images and solving the embedded mathematical problems.

- **Core Technologies Used:**
  - **Pillow** for image processing: Used to manage and manipulate the images drawn on the client side, converting them into base64 strings for further analysis.
  - **FastAPI:** A high-performance web framework for building APIs. It handles HTTP requests from the client and processes them efficiently.
  - **Uvicorn:** An ASGI server for running FastAPI applications. It provides high concurrency for processing client requests.
  - **Base64 Encoding:** Converts the images to a base64 format to send as API payloads.
  - **Image Manipulation:** Handles pre-processing of the images before passing them to the problem-solving logic, ensuring they are in the correct format.
  - **JSON-based Communication:** Solutions to problems are returned in a structured JSON format for the client to parse and display.

- **How it works:**
  1. **Image Encoding:** The server encodes the images using Pillow into a base64 format, preparing them for analysis by the LLMs.
  2. **Prompting and Problem Solving:** 
     - The encoded image, along with relevant variables, is sent to the LLM (via APIs).
     - The LLM is instructed to interpret the image's contents, whether they are simple mathematical expressions, sets of equations, graphical math problems, or abstract concepts.
     - It then returns the results in a structured format (JSON).
  3. **Response:** The server processes the LLM response and sends the results back to the client for display.

### Examples of Supported Problems
- **Simple Mathematical Expressions:** Basic arithmetic using PEMDAS rules.
- **Equations:** Solves for unknown variables in linear or quadratic equations.
- **Graphical Math Problems:** Calculates answers for problems involving geometric figures or physics simulations (e.g., projectile motion).
- **Word Problems:** Interprets word problems related to math or physics through the drawing and text context.

## How to Use
1. **Drawing/Creating Problems:** Use the client canvas tools to draw shapes, write equations, or describe a physics problem (e.g., projectile motion).
2. **Execution:** Once you're done, press the "Run" button, and the problem-solving request will be sent to the server.
3. **Receive Solutions:** The bot will analyze the image, solve the problem using LLMs, and return the solution back to the client.

## Technologies
- **Client-Side:** 
  - TypeScript
  - Vite
  - React
  - CSS for styling the user interface

- **Server-Side:**
  - **FastAPI** for building APIs and handling HTTP requests.
  - **Uvicorn** as an ASGI server to run FastAPI applications.
  - **Pillow** for image manipulation and encoding.
  - **Base64** encoding for transferring images via API.
  - **Language Models** for the AI/ML part.
  
