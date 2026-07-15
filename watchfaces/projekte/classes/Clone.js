/**
Creates a new rigid body model from an existing block.

@param {object} block - block to be cloned
@extends Block

@example
let clone = new Clone(myBlock)
*/

class Clone extends Block {
  /**
   * @param {block} existing 
   */
  constructor(block) {
    super(block.world, {...block.attributes, body: block.body}, {...block.options});
  }

  addBody() {
    let shape = Matter.Vertices.create(this.attributes.body.vertices, Matter.Body.create({}));
    this.body = Matter.Bodies.fromVertices(0, 0, shape, this.options);
    Matter.Body.setPosition(this.body, this.attributes);
    delete this.attributes.body;
  }
  
  addBodyX() {
    this.body = Matter.Common.clone(this.attributes.body, false);
    this.body.id = Matter.Common.nextId();
    delete this.attributes.body;
  }
}
