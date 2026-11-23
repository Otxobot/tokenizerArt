// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title  TokenizeArt42
 * @author abasante (42 login)
 * @notice ERC-721 / BEP-721 non-fungible token collection for the 42
 *         "TokenizeArt" project. Each token points to a metadata JSON file
 *         stored on IPFS, which itself references an image stored on IPFS.
 *
 * @dev    Security model:
 *         - Only the contract owner can mint new tokens.
 *         - Ownership transfers use a two-step process (Ownable2Step): the new
 *           owner must call `acceptOwnership()`, which prevents handing the
 *           contract to a mistyped address.
 *         - Renouncing ownership is disabled so the collection can never end
 *           up in an owner-less state by accident.
 *         - A token's metadata URI is set once at mint time and can never be
 *           changed afterwards (there is no setter). Because IPFS URIs are
 *           content-addressed (CID), the artwork itself is immutable too.
 *         - The total number of tokens is capped by `MAX_SUPPLY`.
 *         - Holders keep full ERC-721 control over their own tokens: the owner
 *           of the contract has NO power to move or burn someone else's NFT.
 */
contract TokenizeArt42 is ERC721URIStorage, Ownable2Step {
    /// @notice Maximum number of tokens that can ever exist in this collection.
    uint256 public constant MAX_SUPPLY = 42;

    /// @notice 42 login of the artist who created this collection.
    string public constant ARTIST = "abasante";

    /// @dev Id that will be assigned to the next minted token (ids start at 1).
    uint256 private _nextTokenId = 1;

    /// @notice Emitted every time a new NFT is created.
    /// @param recipient   Address that receives the new token.
    /// @param tokenId     Id of the newly minted token.
    /// @param metadataURI URI (ipfs://...) of the token's metadata JSON.
    event ArtMinted(address indexed recipient, uint256 indexed tokenId, string metadataURI);

    /// @notice Thrown when minting would exceed `MAX_SUPPLY`.
    error MaxSupplyReached();

    /// @notice Thrown when an empty metadata URI is supplied.
    error EmptyMetadataURI();

    /// @notice Thrown when someone tries to renounce ownership.
    error RenounceOwnershipDisabled();

    /**
     * @param initialOwner Address that will own the contract (and be allowed to mint).
     */
    constructor(address initialOwner)
        ERC721("TokenizeArt42", "TA42")
        Ownable(initialOwner)
    {}

    /**
     * @notice Mints a new NFT to `recipient` with the given metadata URI.
     * @dev    Uses `_safeMint`, so if `recipient` is a contract it must
     *         implement IERC721Receiver (prevents tokens getting stuck).
     * @param recipient   Address that will own the new token.
     * @param metadataURI URI of the metadata JSON, e.g. "ipfs://<CID>".
     * @return tokenId    Id of the token that was minted.
     */
    function mint(address recipient, string calldata metadataURI)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        if (_nextTokenId > MAX_SUPPLY) revert MaxSupplyReached();

        tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(recipient, tokenId); // reverts on the zero address
        _setTokenURI(tokenId, metadataURI);

        emit ArtMinted(recipient, tokenId, metadataURI);
    }

    /// @notice Number of tokens minted so far.
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @notice Disabled: the collection must always have an owner.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceOwnershipDisabled();
    }
}
