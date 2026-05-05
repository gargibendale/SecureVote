// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {
    struct Election {
        bool exists;
        bool ended; // NEW: track if election is closed
        uint256 candidateCount;
        mapping(uint256 => bool) candidateExists;
        mapping(bytes32 => uint256) voterChoice; // CHANGED: bool → uint256 (stores which candidate they voted for)
        mapping(bytes32 => bool) hasVoted; // KEPT: still useful to quickly check if voted at all
        mapping(uint256 => uint256) voteCount;
    }

    mapping(uint256 => Election) private elections;

    event ElectionCreated(uint256 indexed electionId);
    event ElectionEnded(uint256 indexed electionId); // NEW
    event VoteCast(uint256 indexed electionId, uint256 candidateId);
    event VoteChanged(
        //NEW: separate event for audit trail

        uint256 indexed electionId,
        uint256 previousCandidateId,
        uint256 newCandidateId
    );

    modifier electionExists(uint256 electionId) {
        require(elections[electionId].exists, "Election does not exist");
        _;
    }

    modifier electionActive(uint256 electionId) {
        // NEW: blocks votes on ended elections
        require(!elections[electionId].ended, "Election has ended");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function createElection(
        uint256 electionId,
        uint256[] calldata candidateIds
    ) external onlyOwner {
        // CHANGED: onlyOwner added
        require(!elections[electionId].exists, "Election already exists");
        require(candidateIds.length > 0, "No candidates provided");

        elections[electionId].exists = true;

        for (uint256 i = 0; i < candidateIds.length; i++) {
            elections[electionId].candidateExists[candidateIds[i]] = true;
            elections[electionId].candidateCount++;
        }

        emit ElectionCreated(electionId);
    }

    function endElection(
        uint256 electionId
    ) external onlyOwner electionExists(electionId) {
        require(!elections[electionId].ended, "Election already ended");
        elections[electionId].ended = true;
        emit ElectionEnded(electionId);
    }

    function castVote(
        uint256 electionId,
        bytes32 voterHash,
        uint256 candidateId
    ) external electionExists(electionId) electionActive(electionId) {
        // CHANGED: added electionActive
        require(
            elections[electionId].candidateExists[candidateId],
            "Invalid candidate"
        );

        if (elections[electionId].hasVoted[voterHash]) {
            // --- RE-VOTE PATH ---
            uint256 previousCandidate = elections[electionId].voterChoice[
                voterHash
            ];
            require(
                previousCandidate != candidateId,
                "Already voted for this candidate"
            );

            elections[electionId].voteCount[previousCandidate] -= 1; // undo old vote
            elections[electionId].voteCount[candidateId] += 1; // apply new vote
            elections[electionId].voterChoice[voterHash] = candidateId;

            emit VoteChanged(electionId, previousCandidate, candidateId);
        } else {
            // --- FIRST VOTE PATH ---
            elections[electionId].hasVoted[voterHash] = true;
            elections[electionId].voterChoice[voterHash] = candidateId;
            elections[electionId].voteCount[candidateId] += 1;
            emit VoteCast(electionId, candidateId);
        }
    }

    function getVotes(
        uint256 electionId,
        uint256 candidateId
    ) external view returns (uint256) {
        return elections[electionId].voteCount[candidateId];
    }

    function getResults(
        uint256 electionId,
        uint256[] calldata candidateIds
    ) external view electionExists(electionId) returns (uint256[] memory) {
        // Allocate a results array of the same length as candidateIds
        uint256[] memory counts = new uint256[](candidateIds.length);

        for (uint256 i = 0; i < candidateIds.length; i++) {
            counts[i] = elections[electionId].voteCount[candidateIds[i]];
        }
        return counts;
    }

    function hasVoterVoted(
        uint256 electionId,
        bytes32 voterHash
    ) external view returns (bool) {
        // NEW: useful for your frontend
        return elections[electionId].hasVoted[voterHash];
    }

    function isElectionActive(uint256 electionId) external view returns (bool) {
        // NEW: frontend status check
        return elections[electionId].exists && !elections[electionId].ended;
    }
}
