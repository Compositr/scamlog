import useDebounce from "@/common/hooks/useDebounce";
import DrawerLayout from "@/modules/dash/components/DrawerLayout";
import { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { APIInvite, GuildVerificationLevel } from "discord-api-types/v10";
import Image from "next/image";
import { Tooltip } from "@nextui-org/react";
import { Prisma } from "@prisma/client";
import { Plus } from "react-feather";
import { toast } from "react-toastify";
import verificationTooltips from "@/modules/translation/object/VerificationTooltips";
import TypeSelect from "@/common/components/form/typeSelect";

export default function Add() {
  const [invite, setInvite] = useState("");
  const [longReport, setLongReport] = useState("");
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [serverType, setServerType] =
    useState("QR");
  const [nsfw, setNSFW] = useState(false);
  const [isDuplicated, setIsDuplicated] = useState(false);
  const debouncedInvite = useDebounce(invite, 800);

  const query = useQuery(
    ["discordserver", debouncedInvite],
    (): Promise<APIInvite> =>
      fetch(
        `https://discord.com/api/v10/invites/${debouncedInvite}?with_counts=true&with_expiration=true`
      ).then((res) => res.json()),
    {
      enabled: !!debouncedInvite,
      refetchOnWindowFocus: false,
      refetchInterval: 120_000, // 2min
      staleTime: 60_000, // 1min
      refetchOnMount: true,
    }
  );

  const checkQuery = useQuery(["serverId", query.data?.guild?.id], () =>
    fetch(`/api/v1/servers?serverId=${query.data?.guild?.id}`).then((res) =>
      res.json()
    )
  );

  useEffect(() => {
    if (checkQuery.data?.data?.servers?.length) {
      return setIsDuplicated(true);
    }
    return setIsDuplicated(false);
  }, [checkQuery.data?.data?.servers]);

  useEffect(() => {
    if (isDuplicated)
      toast(`Server is already in database`, {
        type: "error",
      });
  }, [isDuplicated]);

  return (
    <DrawerLayout>
      <div className="flex flex-col justify-center items-center">
        <form className="form-control">
          <div className="mt-2">
            <label className="label">
              <span className="label-text">Server Invite</span>
            </label>
            <label className="input-group">
              <span>discord.gg/</span>
              <input
                type="text"
                className="input input-bordered"
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4">
            <label className="label">
              <span className="label-text">Owner or Admin IDs</span>
            </label>
            <div className="input-group">
              <input
                type="text"
                className="input input-bordered"
                value={currentAdminId}
                onChange={(e) => setCurrentAdminId(e.target.value)}
              />
              <button
                className="btn btn-square btn-primary"
                role={"button"}
                type="button"
                onClick={() => {
                  setAdminIds([...adminIds, currentAdminId]);
                }}
              >
                <Plus />
              </button>
            </div>
          </div>
          <div className="mt-4">
            {adminIds.map((id) => (
              <div
                className="p-2 rounded-md border text-center mt-2 hover:cursor-pointer hover:border-error animate-shake hover:border transition-colors"
                key={id}
                onClick={() => {
                  setAdminIds(adminIds.filter((adminId) => adminId !== id));
                }}
              >
                {id}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="label">
              <span className="label-text">Scam Type</span>
            </label>
            <TypeSelect setter={setServerType} value={serverType ?? "QR"} />
          </div>
          <div className="mt-4">
            <label className="label">
              <span className="label-text">Long Report</span>
              <span className="label-text-alt">Include lots of detail!</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24 w-96"
              placeholder="Markdown **supported**"
              value={longReport}
              onChange={(e) => setLongReport(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <label className="label cursor-pointer">
              <span className="label-text">Not Safe For Work (NSFW)</span>
              <input
                type="checkbox"
                className="checkbox"
                defaultChecked={false}
                onChange={(e) => setNSFW(e.target.checked)}
              />
            </label>
          </div>
          {query?.data?.guild ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  // We know these exist, typescript doesn't
                  const data: Prisma.ScamServerCreateInput = {
                    memberCount: query.data!.approximate_member_count!,
                    name: query.data!.guild?.name!,
                    serverId: query.data!.guild!.id!,
                    verificationLevel: query.data!.guild?.verification_level!,
                    adminIds: adminIds,
                    bannerHash: query.data?.guild?.banner,
                    description: query.data?.guild?.description,
                    inviteCodes: [query.data!.code!],
                    longReport: longReport,
                    serverType,
                    nsfw,
                    iconHash: query.data?.guild?.icon,
                  };

                  const res = await fetch(`/api/v1/servers/new`, {
                    method: "POST",
                    body: JSON.stringify(data),
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });

                  if (res.status === 409)
                    toast("Server already exists", {
                      type: "error",
                    });

                  setInvite("");
                  setLongReport("");
                  setAdminIds([]);
                }}
                className="btn btn-primary"
              >
                Add to Database
              </button>
            </div>
          ) : null}
        </form>
        <div className="mt-4">
          {!invite ? (
            <span>Please type an invite code</span>
          ) : query.status === "loading" ? (
            <span>Loading data...</span>
          ) : query.status === "error" ? (
            <span>
              Something went wrong trying to do that! Try again sometime later
            </span>
          ) : !query.data?.guild ? (
            <span>Guild not found. Invite may be invalid?</span>
          ) : (
            <div className="flex flex-col justify-center items-center">
              <div className="card card-compact w-80 md:w-96 rounded-md bg-base-300 block">
                <figure className="relative">
                  {query.data.guild?.banner ? (
                    <Image
                      src={`https://cdn.discordapp.com/banners/${query.data.guild.id}/${query.data.guild?.banner}?size=2048`}
                      alt="Server banner"
                      layout="fixed"
                      width={500}
                      height={170}
                    />
                  ) : (
                    <Image
                      src={`/static/img/missingno.png`}
                      alt="Missing server banner"
                      layout="fixed"
                      width={500}
                      height={170}
                    />
                  )}
                  {
                    <div className="absolute -bottom-10 left-5">
                      <Image
                        src={`https://cdn.discordapp.com/icons/${query.data.guild.id}/${query.data.guild?.icon}?size=512`}
                        alt="Server banner"
                        layout="fixed"
                        width={80}
                        height={80}
                        className="rounded-full !border-base-300 !border-8 !border-solid"
                      />
                    </div>
                  }
                </figure>
                <div className="card-body mt-8">
                  <h2 className="card-title">{query.data.guild.name}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-primary">Server ID</span>
                      <span>{query.data.guild.id}</span>
                    </div>
                    <div>
                      <Tooltip
                        content={
                          "Approximate member count, which may not be accurate."
                        }
                      >
                        <span className="block text-primary">Member Count</span>
                      </Tooltip>
                      <span className="">
                        {query.data.approximate_member_count?.toLocaleString() ??
                          "Unknown"}{" "}
                      </span>
                    </div>
                    <div>
                      <Tooltip content="Approximate online members, which may not be accurate.">
                        <span className="block text-primary">
                          Online Members
                        </span>
                      </Tooltip>
                      <span className="">
                        {query.data.approximate_presence_count?.toLocaleString() ??
                          "Unknown"}{" "}
                      </span>
                    </div>
                    <div>
                      <span className="block text-primary">
                        Verification Level
                      </span>
                      <Tooltip
                        content={
                          verificationTooltips[
                            query.data.guild.verification_level
                          ]
                        }
                      >
                        <span className="">
                          {GuildVerificationLevel[
                            query.data.guild.verification_level
                          ] ?? "Unknown"}{" "}
                        </span>
                      </Tooltip>
                    </div>
                    <div>
                      <span className="block text-primary">
                        Community Description
                      </span>
                      <span className="">
                        {query.data.guild.description ?? "No description set"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DrawerLayout>
  );
}
