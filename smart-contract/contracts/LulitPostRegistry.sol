// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract LulitPostRegistry {
    struct Post {
        string cid;
        uint256 timestamp;
        address owner;
    }

    Post[] private posts;

    event PostCreated(uint256 indexed postId, address indexed owner, string cid, uint256 timestamp);

    function createPost(string calldata cid) external returns (uint256 postId) {
        require(bytes(cid).length > 0, "CID required");

        posts.push(Post({
            cid: cid,
            timestamp: block.timestamp,
            owner: msg.sender
        }));

        postId = posts.length - 1;
        emit PostCreated(postId, msg.sender, cid, block.timestamp);
    }

    function getPost(uint256 id) external view returns (string memory cid, uint256 timestamp, address owner) {
        require(id < posts.length, "Invalid post id");
        Post storage post = posts[id];
        return (post.cid, post.timestamp, post.owner);
    }

    function totalPosts() external view returns (uint256) {
        return posts.length;
    }
}
